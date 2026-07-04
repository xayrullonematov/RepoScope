# Deployment proof screenshots

Drop the image files here using **these exact filenames** — they are already
referenced from [`../alibaba-cloud.md`](../alibaba-cloud.md) (Evidence section),
so once the files exist the doc renders them automatically.

| Filename | What to capture | Redact before saving |
| --- | --- | --- |
| `ecs-console-instance.png` | Alibaba Cloud **ECS console → instance detail**, showing: region `ap-southeast-1` (Singapore), status **Running**, public IP `47.84.200.2`. | Account login email / UID in the top bar; any billing info. Instance-id and the public IP `47.84.200.2` are fine to show. |
| `ecs-metadata-region.png` | A terminal **on the server** running `curl http://100.100.100.200/latest/meta-data/region-id` → `ap-southeast-1`, and `docker ps` showing `reposcope-app-1` up. | Nothing sensitive here, but avoid running `instance-id` / `private-ipv4` in the same shot. |
| `deployment-proof-endpoint.png` | A **browser** at `https://reposcope.myrepo.xyz/api/deployment-proof` showing the JSON (`"platform":"Alibaba Cloud ECS"`, `"region":"ap-southeast-1"`, `"onAlibabaEcs":true`). | — |
| `ipinfo-asn.png` | `https://ipinfo.io/47.84.200.2` (browser) or the `curl` output showing **AS45102 Alibaba**, Singapore. | — |

## How to get the files onto the server

Screenshots are taken on your local machine; copy them into this folder on the
ECS host, e.g.:

```bash
scp ./ecs-console-instance.png \
    hamma@47.84.200.2:/home/hamma/RepoScope/deployment/screenshots/
```

Then tell me and I'll verify they render and commit them. (PNG or JPG both work;
keep names exactly as above.)
