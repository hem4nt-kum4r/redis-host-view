import { useState, useRef } from "react";
import "./App.css";
import { SlatePlainTextEditor } from "./SlatePlainTextEditor";
import { parseHostMapping, createTopo, getMermaid, nodeTypes } from "./redis";
import { getPakoString } from "./pako";
import MermaidRenderer from "./MermaidRenderer";

function App() {

  const downloadSvgRef = useRef(null);

  const [rawHostMapping, setRawHostMapping] = useState({ text: "", html: "" });
  const [rawRedisCluster, setRawRedisCluster] = useState({
    text: "",
    html: "",
  });
  const [clusterName, setClusterName] = useState("");

  const { hosts, ipToHostname } = parseHostMapping(rawHostMapping.text);

  const [redisTopo, errors] = createTopo(rawRedisCluster.text, ipToHostname);

  const [copied, setCopied] = useState(false);

  const [dir, setDir] = useState("LR");

  const [includeLegend, setIncludeLegent] = useState(false);

  const mermaid = getMermaid(redisTopo, clusterName, dir, includeLegend);

  function handleCopy() {
    navigator.clipboard
      .writeText(mermaid.code)
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
        </div>
        <div className="col overflow-scroll">
          <label className="form-label">Host Table View</label>
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
          </div>
        </div>
        <div className="col-6">
          <div className="d-flex justify-content-between">
            <label className="form-label">Mermaid</label>
            <div className="btn-group mb-1">
              <button
                className="btn btn-sm btn-outline-primary"
                style={{ width: "12em" }}
                onClick={handleCopy}
              >
                {copied ? <span><i class="fa-solid fa-check"></i> Copied</span> : <span><i class="fa-solid fa-copy"></i> Copy Mermaid Code</span>}
              </button>
              <a className="btn btn-sm btn-outline-primary" href={`https://mermaid.ai/play#${getPakoString(JSON.stringify(mermaid))}`} target="_blank"><i class="fa-solid fa-arrow-up-from-bracket"></i> Open in Mermaid Play</a>
              <a ref={downloadSvgRef} className="btn btn-sm btn-outline-primary" href="#" target="_blank" download={clusterName}><i class="fa-solid fa-download"></i> Download SVG</a>
            </div>
          </div>
          <div className="mt-3">
            {nodeTypes.map(nt =>
              <span key={nt.id} className="px-2 py-1 me-2 rounded" style={{ background: nt.style.background, color: nt.style.color, border: "1px solid " + nt.style.border }}>{nt.label}</span>
            )}
          </div>
          <div className="mt-3 form-check form-switch">
            <input className="form-check-input" type="checkbox" checked={includeLegend} onChange={e => setIncludeLegent(e.target.checked)} id="include-example" />
            <label className="form-check-label" for="include-exampl">
              Include Legend
            </label>
          </div>
          <div className="btn-group mt-3">
            <button type="button" className={`btn ${dir == "LR" ? "btn-primary" : "btn-outline-primary"} btn-sm`} onClick={() => setDir("LR")}>Left to Right</button>
            <button type="button" className={`btn ${dir == "TD" ? "btn-primary" : "btn-outline-primary"} btn-sm`} onClick={() => setDir("TD")}>Top to Bottom</button>
          </div>
          <MermaidRenderer className="form-control overflow-scroll mt-3" chart={mermaid.code} downloadSvgRef={downloadSvgRef} />
        </div>
      </div>
    </div>
  );
}

export default App;
