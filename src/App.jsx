import { useState } from "react";
import "./App.css";
import { SlatePlainTextEditor } from "./SlatePlainTextEditor";
import { parseHostMapping, createTopo, createMermaid } from "./redis";

function App() {
  const [rawHostMapping, setRawHostMapping] = useState({ text: "", html: "" });
  const [rawRedisCluster, setRawRedisCluster] = useState({
    text: "",
    html: "",
  });
  const [clusterName, setClusterName] = useState("");

  const { hosts, ipToHostname } = parseHostMapping(rawHostMapping.text);

  const [redisTopo, errors] = createTopo(rawRedisCluster.text, ipToHostname);
  const mermaid = createMermaid(redisTopo, clusterName);

  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      .writeText(mermaid)
      .then(() => setCopied(true))
      .then(() => setTimeout(() => setCopied(false), 1000));
  }

  return (
    <div className="container pt-2">
      <div className="row">
        <div className="col">
          <label className="form-label">
            Host Mapping CSV <tt className="text-body-tertiary">ip,hostname</tt>
          </label>
          <SlatePlainTextEditor
            className="form-control font-monospace editor-font"
            placeholder={"10.0.0.32, redis-1.region.example.com"}
            value={rawHostMapping.text}
            onChangeText={(t) =>
              setRawHostMapping({
                text: t,
              })
            }
          />
          {/* <div
            className="form-control font-monospace small"
            contentEditable={true}
            onBlur={(e) =>
              setRawHostMapping({
                text: e.target.innerText,
                html: e.target.innerHTML,
              })
            }
            dangerouslySetInnerHTML={{ __html: rawHostMapping.html }}
          ></div> */}
        </div>
        <div className="col overflow-scroll">
          <label className="form-label">Table View</label>
          <table className="table table-hover table-borderless table-striped table-sm editor-font">
            <thead className="table-secondary">
              <tr>
                <th>#</th>
                <th>IP</th>
                <th>Hostname</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((h, i) => (
                <tr key={h.ip}>
                  <td>{i + 1}</td>
                  <td>{h.ip}</td>
                  <td>{h.hostname}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="row mt-3">
        <div className="col-6">
          <div>
            <label className="form-label">Cluster Name</label>
            {/* <input
              type="text"
              className="form-control"
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
              placeholder="Cluster Name"
            /> */}
            <SlatePlainTextEditor
              className="form-control font-monospace editor-font"
              placeholder="Cluster Name"
              value={clusterName}
              onChangeText={(t) => setClusterName(t)}
              minHeight="1.2em"
            />
          </div>
          <div className="mt-3">
            <label className="form-label">
              Redis Cluster{" "}
              <tt className="text-body-tertiary">CLUSTER NODES</tt>
            </label>
            {errors && errors.length > 0 && (
              <div className="form-control font-monospace editor-font border-danger text-danger mb-3">
                {errors.map((e) => (
                  <p key={e.message}>{e.message}</p>
                ))}
              </div>
            )}
            <SlatePlainTextEditor
              className="form-control font-monospace editor-font"
              placeholder={
                "<id> <ip:port@bus> <flags> <masterId> <pingSent> <pongRecv> <epoch> <linkState> [slots...]"
              }
              value={rawRedisCluster.text}
              onChangeText={(t) =>
                setRawRedisCluster({
                  text: t,
                })
              }
            />
            {/* <div
              className="form-control font-monospace"
              contentEditable={true}
              onBlur={(e) =>
                setRawRedisCluster({
                  text: e.target.innerText,
                  html: e.target.innerHTML,
                })
              }
              dangerouslySetInnerHTML={{ __html: rawRedisCluster.html }}
            ></div> */}
          </div>
        </div>
        <div className="col-6">
          <div className="d-flex justify-content-between">
            <label className="form-label">Mermaid</label>
            <button
              className="btn btn-sm btn-outline-primary pt-0 pb-0 d-block mb-1"
              style={{ width: "9em" }}
              onClick={handleCopy}
            >
              {copied ? "Copied" : "Copy Mermaid"}
            </button>
          </div>
          <div
            className="form-control font-monospace editor-font"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {mermaid}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
