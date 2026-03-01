import { difference } from "lodash";

export function parseHostMapping(hostMapping) {
  const splits = hostMapping
    .split("\n")
    .map((h) => h.trim())
    .filter((h) => h.length > 0)
    .map((h) => h.split(","))
    .filter((s) => s.length >= 2);
  let r = [];
  let ipm = {};
  splits.forEach((s) => {
    const ip = s[0].trim();
    const hostname = s[1].trim();
    r = [...r, { ip, hostname }];
    ipm[ip] = hostname;
  });
  return { hosts: r, ipToHostname: ipm };
}

/**
 * Parse a single Redis `CLUSTER NODES` line into a structured object.
 *
 * Example input:
 * 83ef... 54.91.159.9:7000@17000 master - 0 1772108615000 1 connected 465-1488
 */
function parseClusterNodeLine(line, index, ipToHostname) {
  const lineIndex = `Line: ${index} `;
  if (typeof line !== "string") {
    return [{}, new TypeError(lineIndex + "line must be a string")];
  }

  const parts = line.trim().split(/\s+/);
  if (parts.length < 8) {
    return [
      {},
      new Error(
        lineIndex + `Invalid cluster node line (too few fields): ${line}`,
      ),
    ];
  }

  const [
    id,
    addr, // ip:port@cport
    flagsRaw, // e.g. "myself,master" or "slave"
    masterId, // "-" for masters, else master node id for slaves
    pingSentStr,
    pongRecvStr,
    configEpochStr,
    linkState, // "connected" or "disconnected"
    ...rest // optional: slot ranges or [fail?] tokens; for replicas usually empty
  ] = parts;

  // Split address: <host>:<port>@<cport>
  const addrMatch = addr.match(/^(.+):(\d+)@(\d+)$/);
  if (!addrMatch) {
    return [{}, new Error(lineIndex + `Invalid addr format: ${addr}`)];
  }
  const [, ip, portStr, cportStr] = addrMatch;

  // Flags
  const flags = flagsRaw.split(",").filter(Boolean);

  // Parse optional slot ranges (masters typically have them)
  // Slot tokens look like:
  //  - "0-5460"
  //  - "12345"
  //  - "[12345->-nodeid]" (migrating/importing; we keep separately)
  const slotRanges = [];
  const slotStates = [];

  for (const tok of rest) {
    if (/^\d+$/.test(tok)) {
      slotRanges.push({ start: Number(tok), end: Number(tok) });
    } else if (/^\d+-\d+$/.test(tok)) {
      const [s, e] = tok.split("-").map(Number);
      slotRanges.push({ start: s, end: e });
    } else if (/^\[.*\]$/.test(tok)) {
      slotStates.push(tok); // keep raw; you can parse further if needed
    } else {
      // unknown extra token; keep it in slotStates so nothing is lost
      slotStates.push(tok);
    }
  }

  return [
    {
      id,
      ip, // IP or hostname as shown in the line,
      hostname: ipToHostname[ip] || ip,
      port: Number(portStr),
      busPort: Number(cportStr), // cluster bus port after "@"
      flags,
      role: flags.includes("slave") ? "slave" : "master",
      masterId: masterId === "-" ? null : masterId,
      pingSent: Number(pingSentStr),
      pongRecv: Number(pongRecvStr),
      configEpoch: Number(configEpochStr),
      linkState,
      slotRanges, // [{start,end}, ...]
      slotStates, // raw bracket tokens / other extras
      raw: line,
    },
    undefined,
  ];
}

/**
 * Parse multiple lines (whole CLUSTER NODES output).
 * Returns only successfully parsed entries (skips blank lines).
 */
export function parseClusterNodes(text, ipToHostname) {
  if (typeof text !== "string") throw new TypeError("text must be a string");

  const parsedLines = text
    .split(/\r?\n/)
    .map((l, i) => [l.trim(), i])
    .filter(([l]) => l.length > 0)
    .filter(([l]) => !l.startsWith("#"))
    .map(([l, i]) => parseClusterNodeLine(l, i + 1, ipToHostname));

  const validLines = parsedLines.filter((le) => !le[1]).map((le) => le[0]);
  const errors = parsedLines.map((le) => le[1]).filter((e) => !!e);

  return [validLines, errors];

  // return text
  //   .split(/\r?\n/)
  //   .map((l) => l.trim())
  //   .filter(Boolean)
  //   .filter((l) => !l.startsWith("#"))
  //   .map((l) => parseClusterNodeLine(l, ipToHostname))
  //   .filter((le) => !le[1])
  //   .map((le) => le[0]);
}

export function createTopo(text, ipToHostname) {
  const [nodes, errors] = parseClusterNodes(text, ipToHostname);

  if (errors.length > 0) {
    return [{ hosts: [], topology: {} }, errors];
  }

  const hosts = {};
  const topology = {};

  nodes.forEach((n) => {
    hosts[n.hostname] = 1;
    topology[n.hostname] = [];
  });

  nodes.forEach((n) => {
    topology[n.hostname].push(n);
  });

  nodes.forEach((n) => {
    topology[n.hostname].sort((n1, n2) => n1.port - n2.port);
  });

  return [{ hosts: Object.keys(hosts).sort(), topology }];
}

export function createMermaid(redisTopo, clusterName) {
  const indent = "    ";
  const { hosts, topology } = redisTopo;

  const example = stripMargin(`
    |subgraph legends["Legends"]
    |${indent}example-master["Master"]
    |${indent}example-slave["Slave"]
    |${indent}example-danger["Unreplicated Master"]
    |${indent}example-failed["Failed Node"]
    |${indent}example-empty["Empty Node"]
    |${indent}class example-master master
    |${indent}class example-slave slave
    |${indent}class example-danger danger
    |${indent}class example-failed failed
    |${indent}class example-empty empty
    |end
    `).split("\n");

  const subgraphLines = hosts
    .map((h) => topology[h])
    .flatMap((t) => [
      `subgraph ${t[0].hostname} ["${t[0].hostname}\n${t[0].ip}"]`,
      ...t.map(
        (tt) =>
          `${indent}${prefixHash(tt.id)}("\`${tt.role}@${tt.port}\n${shortenHash(tt.id)}\`")`,
      ),
      "end",
    ]);

  const nodes = hosts.flatMap((h) => topology[h]);

  const masters = nodes.filter((n) => n.role === "master");

  const slaves = nodes.filter((n) => n.role === "slave");

  const emptyMasters = masters
    .filter((n) => n.slotRanges.length === 0)
    .map((n) => n.id);
  const replicatedMasters = slaves.map((s) => s.masterId);

  const vulnerMasters = difference(
    difference(
      masters.map((m) => m.id),
      emptyMasters,
    ),
    replicatedMasters,
  );

  const failedNodes = nodes
    .filter((n) => n.flags.includes("fail") || n.flags.includes("fail?"))
    .map((n) => n.id);

  const edges = slaves.map(
    (n) => `${prefixHash(n.id)} --> ${prefixHash(n.masterId)}`,
  );

  const config = [
    "---",
    `title: ${clusterName}`,
    "config:",
    indent + "layout: elk",
    "---",
  ];

  const classes = [
    ...replicatedMasters.map((id) => `class ${prefixHash(id)} master`),
    ...slaves.map((n) => `class ${prefixHash(n.id)} slave`),
    ...emptyMasters.map((id) => `class ${prefixHash(id)} empty`),
    ...vulnerMasters.map((id) => `class ${prefixHash(id)} danger`),
    ...failedNodes.map((id) => `class ${prefixHash(id)} failed`),
  ];

  const defs = [
    "classDef master stroke-width:1px, stroke-dasharray:none, stroke:#46EDC8, fill:#DEFFF8, color:#378E7A",
    "classDef danger stroke-width:1px, stroke-dasharray:none, stroke:#FFD600, fill:#FFD600, color:#424242",
    "classDef failed stroke-width:4px, stroke-dasharray:0, stroke:#D50000, fill:#D50000, color:#FFFFFF",
    "classDef empty stroke-width:1px, stroke-dasharray:none, stroke:#999999, fill:#EEEEEE, color:#000000",
    "classDef slave stroke-width:1px, stroke-dasharray:none, stroke:#374D7C, fill:#E2EBFF, color:#374D7C",
    "classDef transparentbg stroke-width:1px, stroke-dasharray:none, stroke:#999999, fill:#00000000, color:#374D7C, rx:2ex, ry:2ex",
  ];

  const graph = stripMargin(
    `flowchart LR
    |${indent}subgraph topology["Redis Cluster Topology"]
    |${subgraphLines.map((l) => indent + indent + l).join("\n")}
    |${edges.map((l) => indent + indent + l).join("\n")}
    |${classes.map((l) => indent + indent + l).join("\n")}
    |${indent}end
    |${example.map((l) => indent + l).join("\n")}
    |${indent}class topology transparentbg
    |${defs.map((l) => indent + l).join("\n")}
    `,
  );

  return config.join("\n") + "\n" + graph;
}

function prefixHash(str) {
  if (!str || str.length <= 8) return str;
  return str.slice(0, 8);
}

function shortenHash(str) {
  if (!str || str.length <= 16) return str;
  return `${str.slice(0, 8)}...${str.slice(-8)}`;
}

function stripMargin(text, marginChar = "|") {
  const trimmed = text.replace(/^\n/, "").replace(/\n\s*$/, "");
  const re = new RegExp(`^\\s*\\${marginChar}`, ""); // escape margin char
  return trimmed
    .split("\n")
    .map((line) => line.replace(re, ""))
    .join("\n");
}
