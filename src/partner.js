export const PARTNER = {
  brand: "Stratton Finance",
  role: "MissingCash finance partner",
  acl: "364340",
  consultant: {
    name: "Erin Crofton",
    title: "Finance Consultant",
    mobile: "0432 280 181",
    email: "Erin.Crofton@stratton.com.au",
    page: "https://strattonfinance.com.au/wanneroo",
    area: "Wanneroo, Perth WA",
  },
  quote: "https://app.strattonfinance.com.au/?rcid=9b783c62-5435-4f78-bfbc-8dc1681dfd41&utm_channel=Referrers&utm_source=MissingCash&utm_medium=Website_Integration&utm_campaign=Erin_Crofton",
  products: ["Home loans", "Car finance", "Personal loans", "Business loans"],
  awards: [
    "Best Car Loan, ProductReview.com.au, 2021–2025",
    "Best Large Asset Broker, WeMoney, 2023 and 2024",
  ],
  note: "Each customer gets Erin as their dedicated contact. She can be reached on mobile, and can meet in person. Approval, rates and repayments are set by the lender after assessment. Not a promise of a rate below the RBA cash rate.",
};

export function partnerHtml() {
  const p = PARTNER;
  const e = p.consultant;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Erin Crofton · Stratton Finance · HeyMia</title>
<style>
body{margin:0;background:#061826;color:#dde8f5;font-family:system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:28px 18px 48px}
.kicker{color:#f5b942;letter-spacing:.12em;font-size:12px;font-weight:700}
h1{font-size:40px;margin:8px 0 4px}
.sub{color:#7a9ab5;margin:0 0 18px}
.card{background:#0b2a3d;border:1px solid rgba(245,185,66,.25);border-radius:16px;padding:18px;margin:12px 0}
a{color:#f5b942}
.row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #1a3a52}
.btn{display:inline-block;background:#f5b942;color:#000;font-weight:700;text-decoration:none;padding:12px 16px;border-radius:999px;margin-top:8px}
small{color:#7a9ab5;display:block;margin-top:14px;line-height:1.45}
</style></head><body><main>
<p class="kicker">MISSINGCASH PARTNER</p>
<h1>${e.name}</h1>
<p class="sub">${e.title} · ${e.area} · ACL ${p.acl}</p>
<div class="card">
<p>Your dedicated Stratton account manager. Call or text Erin direct. She can meet, walk the options, and stay on the file.</p>
<div class="row"><span>Mobile</span><a href="tel:+61432280181">${e.mobile}</a></div>
<div class="row"><span>Email</span><a href="mailto:${e.email}">${e.email}</a></div>
<div class="row"><span>Page</span><a href="${e.page}">strattonfinance.com.au/wanneroo</a></div>
<a class="btn" href="${p.quote}">Get a quote</a>
</div>
<div class="card">
<h2>${p.brand}</h2>
<p>Home, car, personal and business finance. Award-winning broker. Panel of 40+ lenders. Erin looks for a sharper rate than a standard bank quote. Rates are not guaranteed and are not a claim below the RBA cash rate.</p>
<ul>${p.products.map((x) => `<li>${x}</li>`).join("")}</ul>
<ul>${p.awards.map((x) => `<li>${x}</li>`).join("")}</ul>
</div>
<small>${p.note} Stratton Finance Pty Ltd, Australian Credit Licence 364340.</small>
</main></body></html>`;
}
