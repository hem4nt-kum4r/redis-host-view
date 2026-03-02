import { useEffect, useRef } from "react";
import mermaid from "mermaid";
import elkLayouts from "@mermaid-js/layout-elk";

mermaid.registerLayoutLoaders(elkLayouts);

mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
});

export default function MermaidRenderer({ chart, className }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!chart) return;

        const renderDiagram = async () => {
            try {
                const { svg } = await mermaid.render(
                    `mermaid-${Date.now()}`,
                    chart
                );
                containerRef.current.innerHTML = svg;
            } catch (err) {
                containerRef.current.innerHTML =
                    "<p style='color:red'>Invalid Mermaid diagram</p>";
                console.error(err);
            }
        };

        renderDiagram();
    }, [chart]);

    return <div className={className} ref={containerRef} />;
}