# Redis Host View

Generate your Redis cluster topology in Mermaid flowchart. Use the [Mermaid Live Editor](https://mermaid.ai/live) to render and customize.

## Information Required

1. [optional] IP to hostname mapping in csv format. This would provide the view with hostname, otherwise the IP will be shown.

2. Run the command `CLUSTER NODES` in any of the Redis cluster node to get the cluster node information.

## installing dependencies
```
npm ci
```

## starting the dev server
```
npm run dev
```
