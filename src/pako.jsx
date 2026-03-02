import pako from 'pako';

export function getPakoString(message) {
    const compressed = pako.deflate(message, { level: 9 })

    const b64 = btoa(String.fromCharCode(...compressed))

    const converted = b64.replaceAll("+", "-").replaceAll("/", "_")

    return "pako:" + converted
}