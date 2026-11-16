# The rdydeck.com Worker

`rdydeck-worker.js` is the Cloudflare Worker named "rdydeck" that serves rdydeck.com. It is kept here so it has a history; the copy that runs is the one deployed to Cloudflare. This folder is not served on rdydeck.com.

What it does: shows the repo's GitHub Pages files at rdydeck.com (except repo-only files such as scripts, tests and notes), takes anonymous error reports and "This grade looks off" flags at /api/report, and shows them at /api/reports?key=... once the secret REPORTS_KEY is set.

Bindings: DB (D1 database rdydeck-reports), LIMIT (rate limit, 10 reports a minute per visitor per location), secret REPORTS_KEY (optional, at least 16 characters, set in the dashboard under Workers, rdydeck, Settings, Variables and Secrets).

Reading reports without the secret: Cloudflare dashboard, Storage and Databases, D1, rdydeck-reports, Console:

    SELECT msg, v, page, br, os, n, last FROM errors ORDER BY n DESC LIMIT 50;
    SELECT arch, reason, v, AVG(grade) AS grade, SUM(n) AS n FROM flags GROUP BY arch, reason, v ORDER BY n DESC;
