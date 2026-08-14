/* ============================================================
   BusinessTools — single-file SPA
   Part 1: Core utilities (formatting, storage, theme, toast)
   ============================================================ */

const CURRENCIES = {
  INR:{symbol:"₹", locale:"en-IN"},
  USD:{symbol:"$", locale:"en-US"},
  EUR:{symbol:"€", locale:"de-DE"},
  GBP:{symbol:"£", locale:"en-GB"},
  AED:{symbol:"د.إ", locale:"en-AE"}
};

function getCurrency(){ return localStorage.getItem("bt_currency") || "INR"; }
function setCurrency(code){ localStorage.setItem("bt_currency", code); }

function formatMoney(value, code){
  code = code || getCurrency();
  const c = CURRENCIES[code] || CURRENCIES.INR;
  if(!isFinite(value)) value = 0;
  const abs = Math.abs(value);
  const decimals = (abs !== 0 && Math.round(abs*100)%100 !== 0) ? 2 : 0;
  const formatted = new Intl.NumberFormat(c.locale, {minimumFractionDigits:decimals, maximumFractionDigits:2}).format(abs);
  return (value < 0 ? "-" : "") + c.symbol + formatted;
}
function formatNumber(value, decimals){
  if(!isFinite(value)) value = 0;
  decimals = decimals === undefined ? 0 : decimals;
  return new Intl.NumberFormat("en-IN", {minimumFractionDigits:0, maximumFractionDigits:decimals}).format(value);
}
function formatPercent(value, decimals){
  if(!isFinite(value)) value = 0;
  decimals = decimals === undefined ? 2 : decimals;
  return (Math.round(value*100)/100).toFixed(decimals).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1") + "%";
}
function num(v){
  if(v === "" || v === null || v === undefined) return NaN;
  return parseFloat(v);
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

/* ---------------- Theme ---------------- */
function initTheme(){
  const saved = localStorage.getItem("bt_theme");
  const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("bt_theme", next);
  });
}

/* ---------------- Mobile nav ---------------- */
function initMobileNav(){
  const menu = document.getElementById("mobile-menu");
  document.getElementById("mobile-open").addEventListener("click", () => menu.classList.add("open"));
  document.getElementById("mobile-close").addEventListener("click", () => menu.classList.remove("open"));
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => menu.classList.remove("open")));
}

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg){
  let el = document.querySelector(".toast");
  if(!el){ el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ---------------- Favorites ---------------- */
function getFavorites(){ try{ return JSON.parse(localStorage.getItem("bt_favorites")||"[]"); }catch(e){ return []; } }
function toggleFavorite(id){
  let favs = getFavorites();
  favs = favs.includes(id) ? favs.filter(f=>f!==id) : favs.concat([id]);
  localStorage.setItem("bt_favorites", JSON.stringify(favs));
  return favs;
}
function isFavorite(id){ return getFavorites().includes(id); }

/* ---------------- Recents ---------------- */
function addRecent(entry){
  let recents = [];
  try{ recents = JSON.parse(localStorage.getItem("bt_recents")||"[]"); }catch(e){}
  recents.unshift({...entry, date: new Date().toISOString()});
  recents = recents.slice(0,20);
  localStorage.setItem("bt_recents", JSON.stringify(recents));
}
function getRecents(){ try{ return JSON.parse(localStorage.getItem("bt_recents")||"[]"); }catch(e){ return []; } }
function clearRecents(){ localStorage.removeItem("bt_recents"); }

/* ---------------- Saved history ---------------- */
function saveHistoryEntry(toolId, name, data){
  let hist = [];
  try{ hist = JSON.parse(localStorage.getItem("bt_history")||"[]"); }catch(e){}
  hist.unshift({id:"h"+Date.now(), toolId, name, data, date: new Date().toISOString()});
  localStorage.setItem("bt_history", JSON.stringify(hist));
}
function getHistory(toolId){
  let hist = [];
  try{ hist = JSON.parse(localStorage.getItem("bt_history")||"[]"); }catch(e){}
  return toolId ? hist.filter(h=>h.toolId===toolId) : hist;
}
function deleteHistoryEntry(id){
  const hist = getHistory().filter(h=>h.id!==id);
  localStorage.setItem("bt_history", JSON.stringify(hist));
}
function renameHistoryEntry(id, newName){
  const hist = getHistory().map(h=> h.id===id ? {...h, name:newName} : h);
  localStorage.setItem("bt_history", JSON.stringify(hist));
}

/* ---------------- Copy / Share / Print / Export ---------------- */
function copyText(text){
  navigator.clipboard.writeText(text).then(()=>toast("Copied to clipboard")).catch(()=>toast("Could not copy — please copy manually"));
}
function shareText(title, text){
  if(navigator.share){ navigator.share({title, text}).catch(()=>{}); }
  else { copyText(text); toast("Sharing isn't supported here — copied instead"); }
}
function printPage(){ window.print(); }
function exportCSV(filename, rows){
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("CSV downloaded");
}
/* ============================================================
   Part 2a: Calculator definitions — Pricing tools (1-7)
   ============================================================ */

const CALC_DEFS = [];

CALC_DEFS.push({
  id:"profit-margin", name:"Profit Margin Calculator", slug:"profit-margin-calculator", category:"Pricing",
  desc:"Find profit, profit margin % and markup % from cost, selling price and quantity.",
  keywords:["profit","margin","markup"],
  inputs:[
    {id:"cost", label:"Cost Price (per unit)", hint:"What you pay to buy or make one unit.", prefix:"₹", placeholder:"e.g. 200"},
    {id:"price", label:"Selling Price (per unit)", hint:"What you charge the customer per unit.", prefix:"₹", placeholder:"e.g. 300"},
    {id:"qty", label:"Quantity", hint:"Number of units sold.", placeholder:"e.g. 50", default:"1"},
  ],
  validate(v){
    const e={};
    if(!(v.cost>0)) e.cost="Cost price must be greater than 0.";
    if(!(v.price>0)) e.price="Selling price must be greater than 0.";
    if(!(v.qty>0)) e.qty="Quantity must be at least 1.";
    return e;
  },
  compute(v){
    const profitPerUnit = v.price - v.cost;
    const totalCost = v.cost*v.qty, totalRevenue = v.price*v.qty, totalProfit = profitPerUnit*v.qty;
    const marginPct = (profitPerUnit/v.price)*100, markupPct = (profitPerUnit/v.cost)*100;
    const negative = profitPerUnit < 0;
    return {
      warning: profitPerUnit<=0 ? "Please enter a selling price greater than the cost price to calculate a positive profit." : null,
      hero:{label:"Total Profit", value:formatMoney(totalProfit), negative},
      grid:[
        {label:"Total Revenue", value:formatMoney(totalRevenue)},
        {label:"Total Cost", value:formatMoney(totalCost)},
        {label:"Profit Per Unit", value:formatMoney(profitPerUnit), tone:negative?"danger":"teal"},
        {label:"Profit Margin", value:formatPercent(marginPct)},
        {label:"Markup", value:formatPercent(markupPct)},
      ],
      summaryText:`Profit Margin Calculator — Cost ${formatMoney(v.cost)}, Selling Price ${formatMoney(v.price)}, Qty ${v.qty}. Total Profit: ${formatMoney(totalProfit)}, Margin: ${formatPercent(marginPct)}.`,
      csvRows:[["Metric","Value"],["Cost Price",v.cost],["Selling Price",v.price],["Quantity",v.qty],["Total Cost",totalCost.toFixed(2)],["Total Revenue",totalRevenue.toFixed(2)],["Total Profit",totalProfit.toFixed(2)],["Profit Per Unit",profitPerUnit.toFixed(2)],["Profit Margin %",marginPct.toFixed(2)],["Markup %",markupPct.toFixed(2)]],
      recentResult:`Profit ${formatMoney(totalProfit)} · Margin ${formatPercent(marginPct)}`
    };
  },
  formula_eq:"Profit = Selling Price − Cost Price\nProfit Margin % = (Profit ÷ Selling Price) × 100\nMarkup % = (Profit ÷ Cost Price) × 100",
  formula_vars:[["Profit","selling price minus cost price, per unit"],["Profit Margin %","profit as a share of the selling price"],["Markup %","profit as a share of the cost price"]],
  tips:["Margin and markup are different numbers — a 50% markup is not the same as a 50% margin.","If your margin is negative, your selling price is below cost.","Track profit per unit alongside total profit so pricing decisions stay accurate at any volume."],
  faqs:[["What is profit margin?","Profit margin is the percentage of your selling price that is profit, calculated as profit divided by selling price."],["What is the difference between margin and markup?","Margin is profit divided by selling price. Markup is profit divided by cost price."],["How do I calculate profit margin?","Subtract cost price from selling price to get profit, then divide profit by selling price and multiply by 100."],["Is this calculator suitable for small businesses?","Yes — it uses the same formulas retailers, wholesalers and freelancers use to price products."],["Can profit margin be negative?","Yes, if your selling price is lower than your cost price. The calculator will flag this clearly."]],
  related:["markup","selling-price","profit-per-unit"]
});

CALC_DEFS.push({
  id:"markup", name:"Markup Calculator", slug:"markup-calculator", category:"Pricing",
  desc:"Turn a cost price and markup % into a selling price and profit.",
  keywords:["markup","selling price","profit"],
  inputs:[
    {id:"cost", label:"Cost Price", prefix:"₹", placeholder:"e.g. 200"},
    {id:"markupPct", label:"Markup %", suffix:"%", placeholder:"e.g. 40"},
  ],
  validate(v){
    const e={};
    if(!(v.cost>0)) e.cost="Cost price must be greater than 0.";
    if(!(v.markupPct>=0)) e.markupPct="Markup % must be 0 or greater.";
    return e;
  },
  compute(v){
    const markupAmount = v.cost*(v.markupPct/100);
    const sellingPrice = v.cost+markupAmount;
    const marginPct = sellingPrice>0 ? (markupAmount/sellingPrice)*100 : 0;
    return {
      hero:{label:"Selling Price", value:formatMoney(sellingPrice)},
      grid:[
        {label:"Markup Amount", value:formatMoney(markupAmount)},
        {label:"Profit", value:formatMoney(markupAmount)},
        {label:"Profit Margin", value:formatPercent(marginPct)},
        {label:"Markup %", value:formatPercent(v.markupPct)},
      ],
      summaryText:`Markup Calculator — Cost ${formatMoney(v.cost)}, Markup ${formatPercent(v.markupPct)}. Selling Price: ${formatMoney(sellingPrice)}, Margin: ${formatPercent(marginPct)}.`,
      csvRows:[["Metric","Value"],["Cost Price",v.cost],["Markup %",v.markupPct],["Markup Amount",markupAmount.toFixed(2)],["Selling Price",sellingPrice.toFixed(2)],["Profit Margin %",marginPct.toFixed(2)]],
      recentResult:`Selling Price ${formatMoney(sellingPrice)}`
    };
  },
  formula_eq:"Markup Amount = Cost × (Markup % ÷ 100)\nSelling Price = Cost + Markup Amount\nProfit Margin % = (Markup Amount ÷ Selling Price) × 100",
  formula_vars:[["Markup Amount","the rupee amount added on top of cost"],["Selling Price","cost plus the markup amount"],["Profit Margin %","the same profit expressed as a share of selling price"]],
  tips:["A markup of 100% doubles your cost, but only produces a 50% margin.","Use round markup percentages to keep pricing simple.","Compare the resulting margin against your target margin before finalising the price."],
  faqs:[["What is markup?","Markup is the amount added to your cost price to arrive at a selling price, expressed as a percentage of cost."],["How is markup different from margin?","Markup is calculated on cost price; margin is calculated on selling price."],["What markup should I use?","It depends on your industry, costs and competition — this calculator shows the resulting price and margin."],["Does 50% markup mean 50% profit?","No. A 50% markup on a ₹200 cost gives a ₹300 selling price, which is only a 33.33% profit margin."]],
  related:["profit-margin","selling-price","retail-pricing"]
});

CALC_DEFS.push({
  id:"selling-price", name:"Selling Price Calculator", slug:"selling-price-calculator", category:"Pricing",
  desc:"Work out the price to charge using margin or markup, plus extra costs and GST.",
  keywords:["selling price","price","margin","markup","gst"],
  modes:{options:[["margin","Profit Margin"],["markup","Markup"]], default:"margin",
    labelOverride:{pct:{margin:"Desired Profit Margin %", markup:"Desired Markup %"}}},
  inputs:[
    {id:"cost", label:"Cost Price", prefix:"₹", placeholder:"e.g. 250"},
    {id:"extra", label:"Additional Costs", hint:"Packaging, shipping or other per-unit costs.", prefix:"₹", placeholder:"e.g. 20", default:"0"},
    {id:"pct", label:"Desired Profit Margin %", suffix:"%", placeholder:"e.g. 30"},
    {id:"gst", label:"Tax / GST %", suffix:"%", placeholder:"e.g. 18", default:"0"},
  ],
  validate(v, mode){
    const e={};
    if(!(v.cost>0)) e.cost="Cost price must be greater than 0.";
    if(!(v.extra>=0)) e.extra="Additional costs cannot be negative.";
    if(mode==="margin"){ if(!(v.pct>=0 && v.pct<100)) e.pct="Margin % must be between 0 and 99.99."; }
    else { if(!(v.pct>=0)) e.pct="Markup % must be 0 or greater."; }
    if(!(v.gst>=0)) e.gst="GST % cannot be negative.";
    return e;
  },
  compute(v, mode){
    const base = v.cost+v.extra;
    const preTax = mode==="margin" ? base/(1-v.pct/100) : base*(1+v.pct/100);
    const profit = preTax-base;
    const finalPrice = preTax*(1+v.gst/100);
    const gstAmount = finalPrice-preTax;
    return {
      hero:{label:"Final Selling Price", value:formatMoney(finalPrice)},
      grid:[
        {label:"Base Cost", value:formatMoney(base)},
        {label:"Profit", value:formatMoney(profit)},
        {label:"Pre-tax Price", value:formatMoney(preTax)},
        {label:"GST Amount", value:formatMoney(gstAmount)},
      ],
      summaryText:`Selling Price Calculator (${mode} mode) — Base ${formatMoney(base)}, Target ${formatPercent(v.pct)}, GST ${formatPercent(v.gst)}. Final Price: ${formatMoney(finalPrice)}.`,
      csvRows:[["Metric","Value"],["Mode",mode],["Cost",v.cost],["Additional Costs",v.extra],["Target %",v.pct],["GST %",v.gst],["Base Cost",base.toFixed(2)],["Pre-tax Price",preTax.toFixed(2)],["Profit",profit.toFixed(2)],["GST Amount",gstAmount.toFixed(2)],["Final Selling Price",finalPrice.toFixed(2)]],
      recentResult:`Final Price ${formatMoney(finalPrice)}`
    };
  },
  formula_eq:"Base = Cost + Additional Costs\nMargin mode:  Pre-tax Price = Base ÷ (1 − Margin% ÷ 100)\nMarkup mode:  Pre-tax Price = Base × (1 + Markup% ÷ 100)\nFinal Price = Pre-tax Price × (1 + GST% ÷ 100)",
  formula_vars:[["Base","cost price plus additional per-unit costs"],["Pre-tax Price","price needed before GST to hit your target"],["Final Selling Price","the price to charge, including GST"]],
  tips:["Add packaging, shipping and platform fees into Additional Costs.","In margin mode, a margin of 100% or more is impossible.","GST is applied after profit is added."],
  faqs:[["Should I use margin mode or markup mode?","Margin mode if you think in terms of 'what share of price is profit'; markup mode if you think 'how much do I add on top of cost'."],["Why can't margin be 100% or higher?","Profit can never exceed the selling price itself, so margin stays below 100%."],["Does this include GST in the cost or the price?","GST is added on top of your pre-tax price to give the final price."],["What should I include in Additional Costs?","Packaging, delivery, marketplace commission or payment gateway fees."]],
  related:["profit-margin","markup","gst"]
});

CALC_DEFS.push({
  id:"profit-per-unit", name:"Profit Per Unit Calculator", slug:"profit-per-unit-calculator", category:"Pricing",
  desc:"Break down profit per unit, total profit and margin across units sold.",
  keywords:["profit per unit","unit economics"],
  inputs:[
    {id:"cost", label:"Cost Per Unit", prefix:"₹", placeholder:"e.g. 150"},
    {id:"price", label:"Selling Price Per Unit", prefix:"₹", placeholder:"e.g. 220"},
    {id:"units", label:"Units Sold", placeholder:"e.g. 120", default:"1"},
  ],
  validate(v){
    const e={};
    if(!(v.cost>0)) e.cost="Cost per unit must be greater than 0.";
    if(!(v.price>0)) e.price="Selling price per unit must be greater than 0.";
    if(!(v.units>0)) e.units="Units sold must be at least 1.";
    return e;
  },
  compute(v){
    const profitPerUnit=v.price-v.cost, totalProfit=profitPerUnit*v.units, revenue=v.price*v.units, totalCost=v.cost*v.units;
    const marginPct=(profitPerUnit/v.price)*100, markupPct=v.cost>0?(profitPerUnit/v.cost)*100:0;
    const negative = profitPerUnit<0;
    return {
      warning: profitPerUnit<=0 ? "Please enter a selling price greater than the cost price to calculate a positive profit." : null,
      hero:{label:"Profit Per Unit", value:formatMoney(profitPerUnit), negative},
      grid:[
        {label:"Total Profit", value:formatMoney(totalProfit), tone:negative?"danger":"teal"},
        {label:"Revenue", value:formatMoney(revenue)},
        {label:"Total Cost", value:formatMoney(totalCost)},
        {label:"Profit Margin", value:formatPercent(marginPct)},
        {label:"Markup", value:formatPercent(markupPct)},
      ],
      summaryText:`Profit Per Unit Calculator — Cost ${formatMoney(v.cost)}, Price ${formatMoney(v.price)}, Units ${v.units}. Profit/Unit: ${formatMoney(profitPerUnit)}, Total: ${formatMoney(totalProfit)}.`,
      csvRows:[["Metric","Value"],["Cost Per Unit",v.cost],["Selling Price Per Unit",v.price],["Units Sold",v.units],["Profit Per Unit",profitPerUnit.toFixed(2)],["Total Profit",totalProfit.toFixed(2)],["Revenue",revenue.toFixed(2)],["Total Cost",totalCost.toFixed(2)],["Profit Margin %",marginPct.toFixed(2)],["Markup %",markupPct.toFixed(2)]],
      recentResult:`Profit/unit ${formatMoney(profitPerUnit)}`
    };
  },
  formula_eq:"Profit Per Unit = Selling Price − Cost\nTotal Profit = Profit Per Unit × Units Sold\nProfit Margin % = (Profit Per Unit ÷ Selling Price) × 100",
  formula_vars:[["Profit Per Unit","earnings on a single unit"],["Total Profit","profit per unit multiplied across all units sold"],["Profit Margin %","profit per unit as a share of the selling price"]],
  tips:["Even a small profit-per-unit gain compounds quickly at high volume.","Compare profit per unit against your break-even units."],
  faqs:[["Why calculate profit per unit separately from total profit?","It shows whether your pricing is sound on its own, before volume is factored in."],["What if profit per unit is very small?","Check your break-even units to see how many sales that requires."],["Does this include additional costs like shipping?","Enter your fully-loaded cost per unit — include shipping or packaging in the Cost Per Unit field."]],
  related:["profit-margin","break-even","revenue"]
});

CALC_DEFS.push({
  id:"wholesale-price", name:"Wholesale Price Calculator", slug:"wholesale-price-calculator", category:"Pricing",
  desc:"Set a wholesale price from your buying cost and desired wholesale profit %.",
  keywords:["wholesale","bulk pricing","distributor"],
  inputs:[
    {id:"cost", label:"Manufacturing / Buying Cost (per unit)", prefix:"₹", placeholder:"e.g. 100"},
    {id:"extra", label:"Additional Costs (per unit)", hint:"Packing, freight or handling.", prefix:"₹", placeholder:"e.g. 10", default:"0"},
    {id:"profitPct", label:"Desired Wholesale Profit %", suffix:"%", placeholder:"e.g. 20"},
    {id:"qty", label:"Quantity", placeholder:"e.g. 500", default:"1"},
    {id:"retail", label:"Retail Price (optional)", hint:"To compare wholesale vs retail.", prefix:"₹", placeholder:"e.g. 180", default:"0"},
  ],
  validate(v){
    const e={};
    if(!(v.cost>0)) e.cost="Buying cost must be greater than 0.";
    if(!(v.extra>=0)) e.extra="Additional costs cannot be negative.";
    if(!(v.profitPct>=0)) e.profitPct="Wholesale profit % must be 0 or greater.";
    if(!(v.qty>0)) e.qty="Quantity must be at least 1.";
    if(!(v.retail>=0)) e.retail="Retail price cannot be negative.";
    return e;
  },
  compute(v){
    const unitCost=v.cost+v.extra, wholesaleProfitPerUnit=unitCost*(v.profitPct/100), wholesalePrice=unitCost+wholesaleProfitPerUnit;
    const totalRevenue=wholesalePrice*v.qty, totalProfit=wholesaleProfitPerUnit*v.qty;
    const grid=[
      {label:"Wholesale Profit / Unit", value:formatMoney(wholesaleProfitPerUnit)},
      {label:"Unit Cost", value:formatMoney(unitCost)},
      {label:"Total Wholesale Revenue", value:formatMoney(totalRevenue)},
    ];
    if(v.retail>0){
      const gap=v.retail-wholesalePrice;
      grid.push({label:"Retail vs Wholesale Gap", value:formatMoney(gap), tone: gap>=0?"teal":"danger"});
    }
    grid.push({label:"Wholesale Price / Unit", value:formatMoney(wholesalePrice)});
    return {
      hero:{label:"Total Wholesale Profit", value:formatMoney(totalProfit), negative: totalProfit<0},
      grid,
      summaryText:`Wholesale Price Calculator — Unit Cost ${formatMoney(unitCost)}, Wholesale Price ${formatMoney(wholesalePrice)}, Qty ${v.qty}. Total Profit: ${formatMoney(totalProfit)}.`,
      csvRows:[["Metric","Value"],["Buying Cost",v.cost],["Additional Costs",v.extra],["Profit %",v.profitPct],["Quantity",v.qty],["Unit Cost",unitCost.toFixed(2)],["Wholesale Price / Unit",wholesalePrice.toFixed(2)],["Total Wholesale Revenue",totalRevenue.toFixed(2)],["Total Wholesale Profit",totalProfit.toFixed(2)]],
      recentResult:`Wholesale Price ${formatMoney(wholesalePrice)}`
    };
  },
  formula_eq:"Unit Cost = Buying Cost + Additional Costs\nWholesale Profit Per Unit = Unit Cost × (Profit% ÷ 100)\nWholesale Price = Unit Cost + Wholesale Profit Per Unit\nTotal Wholesale Revenue = Wholesale Price × Quantity",
  formula_vars:[["Unit Cost","buying cost plus any additional per-unit costs"],["Wholesale Price","the price you charge a bulk buyer per unit"],["Total Wholesale Profit","wholesale profit per unit multiplied by quantity"]],
  tips:["Wholesale margins are usually thinner than retail — the profit comes from volume.","Enter a retail price to see the gap you're leaving for a reseller.","Keep additional costs realistic — freight and handling often get underestimated."],
  faqs:[["How is wholesale pricing different from retail pricing?","Wholesale prices are lower per unit because buyers purchase in bulk and often resell at retail."],["What profit % is normal for wholesale?","It varies widely — many wholesalers work with 10–30% profit, relying on volume."],["Why enter a retail price?","It shows the margin gap available to a reseller."]],
  related:["profit-margin","retail-pricing","selling-price"]
});

CALC_DEFS.push({
  id:"discount", name:"Discount Calculator", slug:"discount-calculator", category:"Pricing",
  desc:"Calculate discount amount, final price, tax and savings — plus reverse from a sale price.",
  keywords:["discount","sale price","offer"],
  modes:{options:[["forward","Original → Final"],["reverse","Final → Original"]], default:"forward",
    labelOverride:{price:{forward:"Original Price", reverse:"Sale (Discounted) Price"}}},
  inputs:[
    {id:"price", label:"Original Price", prefix:"₹", placeholder:"e.g. 1000"},
    {id:"discountPct", label:"Discount %", suffix:"%", placeholder:"e.g. 20"},
    {id:"gst", label:"Tax / GST % (optional)", suffix:"%", placeholder:"e.g. 18", default:"0"},
  ],
  validate(v){
    const e={};
    if(!(v.price>0)) e.price="Price must be greater than 0.";
    if(!(v.discountPct>=0 && v.discountPct<100)) e.discountPct="Discount % must be between 0 and 99.99.";
    if(!(v.gst>=0)) e.gst="GST % cannot be negative.";
    return e;
  },
  compute(v, mode){
    let original, discountAmount, priceAfterDiscount;
    if(mode==="forward"){ original=v.price; discountAmount=original*(v.discountPct/100); priceAfterDiscount=original-discountAmount; }
    else { priceAfterDiscount=v.price; original=v.price/(1-v.discountPct/100); discountAmount=original-priceAfterDiscount; }
    const gstAmount=priceAfterDiscount*(v.gst/100), finalPrice=priceAfterDiscount+gstAmount;
    return {
      hero:{label:"Final Price", value:formatMoney(finalPrice)},
      grid:[
        {label:"Original Price", value:formatMoney(original)},
        {label:"Discount Amount", value:formatMoney(discountAmount), tone:"amber"},
        {label:"Price After Discount", value:formatMoney(priceAfterDiscount)},
        {label:"Tax Amount", value:formatMoney(gstAmount)},
        {label:"Total Saved", value:formatMoney(discountAmount), tone:"teal"},
      ],
      summaryText:`Discount Calculator (${mode}) — Discount ${formatPercent(v.discountPct)}. Original: ${formatMoney(original)}, Final: ${formatMoney(finalPrice)}, Saved: ${formatMoney(discountAmount)}.`,
      csvRows:[["Metric","Value"],["Mode",mode],["Discount %",v.discountPct],["GST %",v.gst],["Original Price",original.toFixed(2)],["Discount Amount",discountAmount.toFixed(2)],["Price After Discount",priceAfterDiscount.toFixed(2)],["Tax Amount",gstAmount.toFixed(2)],["Final Price",finalPrice.toFixed(2)]],
      recentResult:`Final Price ${formatMoney(finalPrice)}`
    };
  },
  formula_eq:"Forward:  Discount Amount = Price × (Discount% ÷ 100)\n          Price After Discount = Price − Discount Amount\nReverse:  Original Price = Sale Price ÷ (1 − Discount% ÷ 100)\nFinal Price = Price After Discount × (1 + GST% ÷ 100)",
  formula_vars:[["Discount Amount","the rupee value removed from the original price"],["Price After Discount","original price minus the discount, before tax"],["Final Price","price after discount with GST added, if applicable"]],
  tips:["A discount % above 99 will always fail.","Use reverse mode when you know the sale price and want the original list price.","Stack multiple discounts one calculation at a time rather than adding the percentages together."],
  faqs:[["How do I calculate a discount?","Multiply the original price by the discount percentage to get the discount amount, then subtract it."],["How does reverse mode work?","Enter the price you actually paid and the discount %; Original = Sale Price ÷ (1 − Discount% ÷ 100)."],["Can I apply GST after a discount?","Yes — GST is applied to the discounted price to get your final price."],["Why do two 10% discounts not equal 20%?","Discounts compound on a shrinking base, giving 19% total, not 20%."]],
  related:["selling-price","gst","retail-pricing"]
});

CALC_DEFS.push({
  id:"retail-pricing", name:"Retail Pricing Calculator", slug:"retail-pricing-calculator", category:"Pricing",
  desc:"Combine cost, operating cost, margin, discount and GST into a retail shelf price.",
  keywords:["retail","shelf price","mrp"],
  inputs:[
    {id:"cost", label:"Product Cost", prefix:"₹", placeholder:"e.g. 300"},
    {id:"opCost", label:"Operating Cost Per Unit", hint:"Rent, staff time or overhead allocated to this product.", prefix:"₹", placeholder:"e.g. 40", default:"0"},
    {id:"marginPct", label:"Desired Profit Margin %", suffix:"%", placeholder:"e.g. 35"},
    {id:"discountPct", label:"Planned Discount % (optional)", suffix:"%", placeholder:"e.g. 10", default:"0"},
    {id:"gst", label:"Tax / GST %", suffix:"%", placeholder:"e.g. 18", default:"0"},
  ],
  validate(v){
    const e={};
    if(!(v.cost>0)) e.cost="Product cost must be greater than 0.";
    if(!(v.opCost>=0)) e.opCost="Operating cost cannot be negative.";
    if(!(v.marginPct>=0 && v.marginPct<100)) e.marginPct="Profit margin % must be between 0 and 99.99.";
    if(!(v.discountPct>=0 && v.discountPct<100)) e.discountPct="Discount % must be between 0 and 99.99.";
    if(!(v.gst>=0)) e.gst="GST % cannot be negative.";
    return e;
  },
  compute(v){
    const baseCost=v.cost+v.opCost, minSellingPrice=baseCost/(1-v.marginPct/100);
    const recommendedRetail=minSellingPrice*(1+v.gst/100), discountedPrice=recommendedRetail*(1-v.discountPct/100);
    const profitPerUnit=minSellingPrice-baseCost;
    const safePrice=Math.ceil(recommendedRetail/10)*10;
    const competitivePrice=Math.floor(recommendedRetail-1)+0.99;
    return {
      hero:{label:"Recommended Retail Price", value:formatMoney(recommendedRetail)},
      grid:[
        {label:"Minimum Selling Price", value:formatMoney(minSellingPrice)},
        {label:"Profit Per Unit", value:formatMoney(profitPerUnit)},
        {label:"Discounted Price", value:formatMoney(discountedPrice)},
        {label:"Safe Price", value:formatMoney(safePrice)},
        {label:"Competitive Price", value:formatMoney(competitivePrice)},
      ],
      summaryText:`Retail Pricing Calculator — Base Cost ${formatMoney(baseCost)}, Margin ${formatPercent(v.marginPct)}. Recommended Retail Price: ${formatMoney(recommendedRetail)}.`,
      csvRows:[["Metric","Value"],["Product Cost",v.cost],["Operating Cost",v.opCost],["Margin %",v.marginPct],["Discount %",v.discountPct],["GST %",v.gst],["Base Cost",baseCost.toFixed(2)],["Minimum Selling Price",minSellingPrice.toFixed(2)],["Recommended Retail Price",recommendedRetail.toFixed(2)],["Discounted Selling Price",discountedPrice.toFixed(2)],["Safe Price",safePrice.toFixed(2)],["Competitive Price",competitivePrice.toFixed(2)]],
      recentResult:`Retail Price ${formatMoney(recommendedRetail)}`
    };
  },
  formula_eq:"Base Cost = Product Cost + Operating Cost\nMinimum Selling Price = Base Cost ÷ (1 − Margin% ÷ 100)\nRecommended Retail Price = Minimum Selling Price × (1 + GST% ÷ 100)\nDiscounted Selling Price = Recommended Retail Price × (1 − Discount% ÷ 100)",
  formula_vars:[["Minimum Selling Price","the lowest pre-tax price that still hits your target margin"],["Recommended Retail Price","minimum selling price with GST added"],["Discounted Selling Price","the price a customer pays if the planned discount is applied"]],
  tips:["Set the retail price first, then check the discounted price still clears your minimum margin.","\"Safe Price\" rounds up slightly to protect margin; \"Competitive Price\" rounds to a natural price point.","Operating cost per unit is often skipped — leaving it at zero understates your true cost."],
  faqs:[["What's the difference between minimum selling price and recommended retail price?","Minimum selling price is the pre-tax floor; recommended retail price adds GST."],["What are the 'Safe Price' and 'Competitive Price' suggestions?","Both are based only on your own numbers, not market data."],["Should the discount reduce my margin?","Yes — Discounted Selling Price shows what you actually receive if the discount is applied."]],
  related:["selling-price","discount","gst"]
});
/* ============================================================
   Part 2b: Calculator definitions 8-13 (Planning / Finance / Ops)
   ============================================================ */

CALC_DEFS.push({
  id:"break-even", name:"Break-Even Calculator", slug:"break-even-calculator", category:"Business Planning",
  desc:"Find the units and revenue you need to cover fixed costs — and to hit a profit target.",
  keywords:["break even","fixed cost","contribution margin"],
  inputs:[
    {id:"fixed", label:"Fixed Costs", hint:"Rent, salaries and other costs that don't change with sales volume.", prefix:"₹", placeholder:"e.g. 50000"},
    {id:"price", label:"Selling Price Per Unit", prefix:"₹", placeholder:"e.g. 500"},
    {id:"varCost", label:"Variable Cost Per Unit", hint:"Cost that changes with each unit sold.", prefix:"₹", placeholder:"e.g. 300"},
    {id:"target", label:"Target Profit (optional)", prefix:"₹", placeholder:"e.g. 20000", default:"0"},
  ],
  validate(v){
    const e={};
    if(!(v.fixed>=0)) e.fixed="Fixed costs cannot be negative.";
    if(!(v.price>0)) e.price="Selling price must be greater than 0.";
    if(!(v.varCost>=0)) e.varCost="Variable cost cannot be negative.";
    if(!(v.target>=0)) e.target="Target profit cannot be negative.";
    return e;
  },
  compute(v){
    const contribution=v.price-v.varCost;
    if(contribution<=0){
      return {error:"Selling price must be greater than variable cost — otherwise every unit sold loses money and break-even is impossible."};
    }
    const beUnits=v.fixed/contribution, beRevenue=beUnits*v.price;
    const targetUnits=v.target>0 ? (v.fixed+v.target)/contribution : null;
    const max=Math.max(beUnits, targetUnits||beUnits*1.3);
    const chartHtml=`<div class="bar-chart">
      <div class="bar" style="height:${Math.max(10,(beUnits/max)*130)}px" title="Break-even units"></div>
      <div class="bar b2" style="height:${Math.max(10,((targetUnits||beUnits*1.3)/max)*130)}px" title="Target units"></div>
    </div><div class="bar-legend"><span><span class="dot teal"></span>Break-even units</span><span><span class="dot amber"></span>${v.target>0?"Units for target profit":"1.3× break-even (reference)"}</span></div>`;
    const grid=[{label:"Contribution Per Unit", value:formatMoney(contribution)},{label:"Break-Even Revenue", value:formatMoney(beRevenue)}];
    if(targetUnits!==null){
      grid.push({label:"Units for Target Profit", value:formatNumber(Math.ceil(targetUnits)), tone:"amber"});
      grid.push({label:"Revenue for Target Profit", value:formatMoney(targetUnits*v.price)});
    }
    const csvRows=[["Metric","Value"],["Fixed Costs",v.fixed],["Selling Price",v.price],["Variable Cost",v.varCost],["Contribution Per Unit",contribution.toFixed(2)],["Break-Even Units",Math.ceil(beUnits)],["Break-Even Revenue",beRevenue.toFixed(2)]];
    if(targetUnits!==null) csvRows.push(["Target Profit",v.target],["Units For Target Profit",Math.ceil(targetUnits)]);
    return {
      hero:{label:"Break-Even Units", value:formatNumber(Math.ceil(beUnits))+" units"},
      grid, chartHtml,
      summaryText:`Break-Even Calculator — Fixed Costs ${formatMoney(v.fixed)}, Contribution ${formatMoney(contribution)}/unit. Break-Even: ${Math.ceil(beUnits)} units.`,
      csvRows, recentResult:`${Math.ceil(beUnits)} units to break even`
    };
  },
  formula_eq:"Contribution Per Unit = Selling Price − Variable Cost\nBreak-Even Units = Fixed Costs ÷ Contribution Per Unit\nBreak-Even Revenue = Break-Even Units × Selling Price\nUnits for Target Profit = (Fixed Costs + Target Profit) ÷ Contribution Per Unit",
  formula_vars:[["Contribution Per Unit","what each unit sold contributes toward fixed costs"],["Break-Even Units","units needed so total contribution equals fixed costs"],["Break-Even Revenue","revenue at the break-even point"]],
  tips:["If selling price is below variable cost, you can never break even on volume alone.","A high fixed cost with low contribution per unit means you need very high volume.","Set a target profit to see how much extra volume is required."],
  faqs:[["What is the break-even point?","The number of units (or revenue) where total income exactly equals total costs."],["What is contribution margin?","Selling price minus variable cost — the amount each sale contributes toward fixed costs."],["What if variable cost is higher than selling price?","No volume of sales can reach break-even — the price or cost needs to change first."],["How do I calculate units for a profit target?","Add target profit to fixed costs before dividing by contribution per unit."]],
  related:["profit-margin","revenue","business-roi"]
});

CALC_DEFS.push({
  id:"revenue", name:"Revenue Calculator", slug:"revenue-calculator", category:"Finance",
  desc:"Project daily, weekly, monthly and annual revenue from units sold per day.",
  keywords:["revenue","sales projection"],
  inputs:[
    {id:"units", label:"Units Sold Per Day", placeholder:"e.g. 25"},
    {id:"price", label:"Selling Price Per Unit", prefix:"₹", placeholder:"e.g. 400"},
    {id:"workDays", label:"Working Days Per Month", placeholder:"e.g. 26", default:"26"},
    {id:"months", label:"Months", hint:"For the total revenue figure.", placeholder:"e.g. 12", default:"12"},
  ],
  validate(v){
    const e={};
    if(!(v.units>0)) e.units="Units sold per day must be greater than 0.";
    if(!(v.price>0)) e.price="Selling price must be greater than 0.";
    if(!(v.workDays>0 && v.workDays<=31)) e.workDays="Working days per month must be between 1 and 31.";
    if(!(v.months>0)) e.months="Months must be greater than 0.";
    return e;
  },
  compute(v){
    const daily=v.units*v.price, weekly=daily*7, monthly=daily*v.workDays, annual=monthly*12, total=monthly*v.months;
    const max=Math.max(daily,weekly,monthly);
    const chartHtml=`<div class="bar-chart"><div class="bar" style="height:${Math.max(6,(daily/max)*130)}px"></div><div class="bar" style="height:${Math.max(6,(weekly/max)*130)}px"></div><div class="bar" style="height:${Math.max(6,(monthly/max)*130)}px"></div></div><div class="bar-legend"><span>Daily</span><span>Weekly</span><span>Monthly</span></div>`;
    return {
      hero:{label:"Total Revenue ("+v.months+" mo)", value:formatMoney(total)},
      grid:[{label:"Daily Revenue", value:formatMoney(daily)},{label:"Weekly Revenue", value:formatMoney(weekly)},{label:"Monthly Revenue", value:formatMoney(monthly)},{label:"Annual Revenue", value:formatMoney(annual)}],
      chartHtml,
      summaryText:`Revenue Calculator — ${v.units} units/day at ${formatMoney(v.price)}. Monthly: ${formatMoney(monthly)}, Annual: ${formatMoney(annual)}.`,
      csvRows:[["Metric","Value"],["Units Per Day",v.units],["Selling Price",v.price],["Working Days/Month",v.workDays],["Months",v.months],["Daily Revenue",daily.toFixed(2)],["Weekly Revenue",weekly.toFixed(2)],["Monthly Revenue",monthly.toFixed(2)],["Annual Revenue",annual.toFixed(2)],["Total Revenue",total.toFixed(2)]],
      recentResult:`Monthly ${formatMoney(monthly)}`
    };
  },
  formula_eq:"Daily Revenue = Units Per Day × Price\nWeekly Revenue = Daily Revenue × 7\nMonthly Revenue = Daily Revenue × Working Days Per Month\nAnnual Revenue = Monthly Revenue × 12",
  formula_vars:[["Daily Revenue","units sold per day multiplied by selling price"],["Monthly Revenue","daily revenue scaled by your actual working days"],["Total Revenue","monthly revenue scaled to the number of months you entered"]],
  tips:["Weekly revenue assumes 7 selling days — adjust manually if closed on certain days.","Use your real working days per month, not a flat 30.","This is revenue, not profit — subtract costs separately."],
  faqs:[["Is this revenue or profit?","This is revenue (total sales value), not profit."],["Why doesn't monthly revenue equal daily × 30?","It's scaled by your actual working days, usually lower than 30."],["How is annual revenue calculated?","Monthly revenue multiplied by 12."]],
  related:["business-roi","break-even","profit-per-unit"]
});

CALC_DEFS.push({
  id:"business-roi", name:"Business ROI Calculator", slug:"business-roi-calculator", category:"Finance",
  desc:"Work out net profit, ROI % and annualised ROI on a business investment.",
  keywords:["roi","return on investment"],
  inputs:[
    {id:"investment", label:"Initial Investment", prefix:"₹", placeholder:"e.g. 200000"},
    {id:"revenue", label:"Revenue / Return", prefix:"₹", placeholder:"e.g. 320000"},
    {id:"opCosts", label:"Operating Costs", prefix:"₹", placeholder:"e.g. 40000", default:"0"},
    {id:"otherCosts", label:"Other Costs", prefix:"₹", placeholder:"e.g. 10000", default:"0"},
    {id:"months", label:"Time Period (months)", placeholder:"e.g. 12", default:"12"},
  ],
  validate(v){
    const e={};
    if(!(v.investment>0)) e.investment="Initial investment must be greater than 0.";
    if(!(v.revenue>=0)) e.revenue="Revenue / return cannot be negative.";
    if(!(v.opCosts>=0)) e.opCosts="Operating costs cannot be negative.";
    if(!(v.otherCosts>=0)) e.otherCosts="Other costs cannot be negative.";
    if(!(v.months>0)) e.months="Time period must be greater than 0 months.";
    return e;
  },
  compute(v){
    const totalCosts=v.investment+v.opCosts+v.otherCosts, netProfit=v.revenue-totalCosts;
    const roiPct=(netProfit/v.investment)*100, annualizedRoi=roiPct*(12/v.months);
    const negative=netProfit<0;
    const grid=[{label:"Total Costs", value:formatMoney(totalCosts)},{label:"ROI %", value:formatPercent(roiPct), tone:negative?"danger":"teal"}];
    if(Math.round(v.months)!==12) grid.push({label:"Annualised ROI %", value:formatPercent(annualizedRoi)});
    return {
      hero:{label:"Net Profit", value:formatMoney(netProfit), negative},
      grid,
      summaryText:`Business ROI Calculator — Investment ${formatMoney(v.investment)}, Return ${formatMoney(v.revenue)}. Net Profit: ${formatMoney(netProfit)}, ROI: ${formatPercent(roiPct)}.`,
      csvRows:[["Metric","Value"],["Initial Investment",v.investment],["Revenue/Return",v.revenue],["Operating Costs",v.opCosts],["Other Costs",v.otherCosts],["Time Period (months)",v.months],["Total Costs",totalCosts.toFixed(2)],["Net Profit",netProfit.toFixed(2)],["ROI %",roiPct.toFixed(2)],["Annualised ROI %",annualizedRoi.toFixed(2)]],
      recentResult:`ROI ${formatPercent(roiPct)}`
    };
  },
  formula_eq:"Total Costs = Initial Investment + Operating Costs + Other Costs\nNet Profit = Revenue − Total Costs\nROI % = (Net Profit ÷ Initial Investment) × 100\nAnnualised ROI % = ROI % × (12 ÷ Months)",
  formula_vars:[["Net Profit","revenue minus every cost, including the original investment"],["ROI %","net profit as a share of the initial investment"],["Annualised ROI %","ROI scaled to a 12-month period for comparison"]],
  tips:["ROI treats your initial investment as a cost.","Annualised ROI lets you compare projects of different lengths fairly.","If Initial Investment is zero, ROI % can't be calculated."],
  faqs:[["What counts as 'Revenue / Return'?","The total money the investment brought in, before subtracting costs."],["Why annualise ROI?","A 15% return in 3 months is stronger than 15% in 12 months — annualising makes them comparable."],["What if my ROI is negative?","Total costs exceeded what the investment returned."]],
  related:["revenue","break-even","commission"]
});

CALC_DEFS.push({
  id:"gst", name:"GST Calculator", slug:"gst-calculator", category:"Finance",
  desc:"Add or remove GST at any rate — 5%, 12%, 18%, 28% or a custom rate.",
  keywords:["gst","tax","gst calculator"],
  modes:{options:[["add","Add GST"],["remove","Remove GST"]], default:"add",
    labelOverride:{amount:{add:"Base Amount", remove:"GST-Inclusive Amount"}}},
  inputs:[
    {id:"amount", label:"Amount", hint:"Base price in Add mode, or GST-inclusive price in Remove mode.", prefix:"₹", placeholder:"e.g. 1000"},
    {id:"rate", label:"GST Rate", type:"select", options:[["0","0%"],["5","5%"],["12","12%"],["18","18%"],["28","28%"],["custom","Custom"]], default:"18"},
    {id:"customRate", label:"Custom GST Rate", suffix:"%", placeholder:"e.g. 15", showIf:{field:"rate", equals:"custom"}},
  ],
  validate(v){
    const e={};
    if(!(v.amount>0)) e.amount="Amount must be greater than 0.";
    if(v.rate==="custom"){ if(!(v.customRate>=0)) e.customRate="Custom GST rate must be 0 or greater."; }
    return e;
  },
  compute(v, mode){
    const rate = v.rate==="custom" ? v.customRate : parseFloat(v.rate);
    let base, gstAmount, finalPrice;
    if(mode==="add"){ base=v.amount; gstAmount=base*(rate/100); finalPrice=base+gstAmount; }
    else { finalPrice=v.amount; base=v.amount/(1+rate/100); gstAmount=finalPrice-base; }
    return {
      hero:{label: mode==="add"?"Final Price (incl. GST)":"Original Base Price", value:formatMoney(mode==="add"?finalPrice:base)},
      grid:[
        {label:"Base Price", value:formatMoney(base)},
        {label:"GST Amount", value:formatMoney(gstAmount), tone:"amber"},
        {label:"Final Price", value:formatMoney(finalPrice)},
        {label:"GST Rate", value:formatPercent(rate)},
      ],
      summaryText:`GST Calculator (${mode}, ${formatPercent(rate)}) — Base: ${formatMoney(base)}, GST: ${formatMoney(gstAmount)}, Final: ${formatMoney(finalPrice)}.`,
      csvRows:[["Metric","Value"],["Mode",mode],["GST Rate %",rate],["Base Price",base.toFixed(2)],["GST Amount",gstAmount.toFixed(2)],["Final Price",finalPrice.toFixed(2)]],
      recentResult:`GST ${formatMoney(gstAmount)} @ ${formatPercent(rate)}`
    };
  },
  formula_eq:"Add GST:     GST Amount = Base × (Rate ÷ 100)\n             Final Price = Base + GST Amount\nRemove GST:  Original Base = Amount ÷ (1 + Rate ÷ 100)\n             GST Component = Amount − Original Base",
  formula_vars:[["Base Price","the price before GST is applied"],["GST Amount","the tax amount at the selected rate"],["Final Price","the GST-inclusive price the customer pays"]],
  tips:["Common Indian GST slabs are 5%, 12%, 18% and 28%.","Use Remove GST when you have a GST-inclusive invoice amount.","GST is never simply subtracted from a GST-inclusive price."],
  faqs:[["How do I remove GST from a price correctly?","Divide by (1 + rate/100) to get the original base price."],["What GST rates are available?","0%, 5%, 12%, 18%, 28%, plus a custom rate field."],["Is this calculator specific to India?","Built around Indian GST slabs by default, but the formulas work for any percentage-based tax."]],
  related:["selling-price","discount","retail-pricing"]
});

CALC_DEFS.push({
  id:"loan-emi", name:"Loan EMI Calculator", slug:"loan-emi-calculator", category:"Finance",
  desc:"Calculate monthly EMI, total interest and total payment on a business loan.",
  keywords:["emi","loan","interest"],
  inputs:[
    {id:"principal", label:"Loan Amount", prefix:"₹", placeholder:"e.g. 500000"},
    {id:"rate", label:"Annual Interest Rate", suffix:"%", placeholder:"e.g. 11", default:"0"},
    {id:"tenure", label:"Loan Tenure", placeholder:"e.g. 3"},
    {id:"tenureUnit", label:"Tenure Unit", type:"select", options:[["years","Years"],["months","Months"]], default:"years"},
  ],
  validate(v){
    const e={};
    if(!(v.principal>0)) e.principal="Loan amount must be greater than 0.";
    if(!(v.rate>=0)) e.rate="Interest rate cannot be negative.";
    if(!(v.tenure>0)) e.tenure="Tenure must be greater than 0.";
    return e;
  },
  compute(v){
    const n = v.tenureUnit==="years" ? Math.round(v.tenure*12) : Math.round(v.tenure);
    const r = (v.rate/12)/100;
    let emi;
    if(r===0) emi=v.principal/n;
    else { const f=Math.pow(1+r,n); emi=v.principal*r*f/(f-1); }
    const totalPayment=emi*n, totalInterest=totalPayment-v.principal;
    const max=Math.max(v.principal,totalInterest);
    const chartHtml=`<div class="bar-chart"><div class="bar" style="height:${Math.max(6,(v.principal/max)*130)}px"></div><div class="bar b2" style="height:${Math.max(6,(totalInterest/max)*130)}px"></div></div><div class="bar-legend"><span><span class="dot teal"></span>Principal</span><span><span class="dot amber"></span>Interest</span></div>`;
    return {
      hero:{label:"Monthly EMI", value:formatMoney(emi)},
      grid:[{label:"Principal", value:formatMoney(v.principal)},{label:"Total Interest", value:formatMoney(totalInterest)},{label:"Total Payment", value:formatMoney(totalPayment)},{label:"Tenure", value:n+" months"}],
      chartHtml,
      summaryText:`Loan EMI Calculator — Loan ${formatMoney(v.principal)} at ${formatPercent(v.rate)} for ${n} months. EMI: ${formatMoney(emi)}.`,
      csvRows:[["Metric","Value"],["Loan Amount",v.principal],["Annual Interest Rate %",v.rate],["Tenure (months)",n],["Monthly EMI",emi.toFixed(2)],["Total Interest",totalInterest.toFixed(2)],["Total Payment",totalPayment.toFixed(2)]],
      recentResult:`EMI ${formatMoney(emi)}`
    };
  },
  formula_eq:"r = (Annual Rate ÷ 12) ÷ 100\nn = Tenure in months\nEMI = P × r × (1+r)^n ÷ ((1+r)^n − 1)\nIf r = 0:  EMI = P ÷ n",
  formula_vars:[["P","principal loan amount"],["r","monthly interest rate"],["n","number of monthly instalments"],["EMI","the fixed monthly payment"]],
  tips:["A 0% interest rate simply divides the loan evenly across the tenure.","Longer tenures lower EMI but increase total interest.","This uses the standard reducing-balance EMI formula."],
  faqs:[["How is EMI calculated?","EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1), where P is principal, r is monthly rate, n is months."],["What happens with 0% interest?","EMI = Principal ÷ number of months, no compounding."],["Does a longer tenure always cost more?","It lowers EMI, but typically increases total interest paid."],["Can I enter tenure in months?","Yes — switch the Tenure Unit dropdown."]],
  related:["business-roi","revenue","break-even"]
});

CALC_DEFS.push({
  id:"commission", name:"Commission Calculator", slug:"commission-calculator", category:"Operations",
  desc:"Work out commission payouts on sales, with an optional bonus split across a team.",
  keywords:["commission","sales payout","incentive"],
  inputs:[
    {id:"sales", label:"Sales Amount", prefix:"₹", placeholder:"e.g. 250000"},
    {id:"commPct", label:"Commission %", suffix:"%", placeholder:"e.g. 5"},
    {id:"bonus", label:"Fixed Bonus (optional)", prefix:"₹", placeholder:"e.g. 5000", default:"0"},
    {id:"people", label:"Number of Salespeople", placeholder:"e.g. 1", default:"1"},
  ],
  validate(v){
    const e={};
    if(!(v.sales>=0)) e.sales="Sales amount cannot be negative.";
    if(!(v.commPct>=0)) e.commPct="Commission % cannot be negative.";
    if(!(v.bonus>=0)) e.bonus="Bonus cannot be negative.";
    if(!(v.people>=1)) e.people="Number of salespeople must be at least 1.";
    return e;
  },
  compute(v){
    const commission=v.sales*(v.commPct/100), totalPayout=commission+v.bonus, perPerson=totalPayout/v.people;
    return {
      hero:{label:"Total Payout", value:formatMoney(totalPayout)},
      grid:[{label:"Commission", value:formatMoney(commission)},{label:"Bonus", value:formatMoney(v.bonus)},{label:"Payout Per Salesperson", value:formatMoney(perPerson), tone:"teal"},{label:"Number of Salespeople", value:formatNumber(v.people)}],
      summaryText:`Commission Calculator — Sales ${formatMoney(v.sales)} at ${formatPercent(v.commPct)}. Total Payout: ${formatMoney(totalPayout)}, Per Person: ${formatMoney(perPerson)}.`,
      csvRows:[["Metric","Value"],["Sales Amount",v.sales],["Commission %",v.commPct],["Bonus",v.bonus],["Salespeople",v.people],["Commission",commission.toFixed(2)],["Total Payout",totalPayout.toFixed(2)],["Payout Per Salesperson",perPerson.toFixed(2)]],
      recentResult:`Payout ${formatMoney(totalPayout)}`
    };
  },
  formula_eq:"Commission = Sales Amount × (Commission% ÷ 100)\nTotal Payout = Commission + Bonus\nPayout Per Salesperson = Total Payout ÷ Number of Salespeople",
  formula_vars:[["Commission","the variable payout based on sales amount and rate"],["Total Payout","commission plus any fixed bonus"],["Payout Per Salesperson","total payout divided evenly across the team"]],
  tips:["Leave Number of Salespeople at 1 to see the full payout for an individual.","A fixed bonus is added after commission — it doesn't scale with sales.","For tiered commission, calculate each tier separately and add the results."],
  faqs:[["How is commission calculated?","Sales amount multiplied by the commission percentage."],["Does the bonus apply per person or the whole team?","It's added to the total payout before it's split across the team."],["Can I use this for tiered commission rates?","Calculate each tier separately at its own rate, then add the results together."]],
  related:["business-roi","revenue","profit-margin"]
});
/* ============================================================
   Part 2c: Calculator definitions 14-20
   ============================================================ */

CALC_DEFS.push({
  id:"cash-flow", name:"Cash Flow Calculator", slug:"cash-flow-calculator", category:"Finance",
  desc:"Calculate total cash inflow, outflow, net cash flow and closing cash for the month.",
  keywords:["cash flow","inflow","outflow"],
  inputs:[
    {id:"opening", label:"Opening Cash", prefix:"₹", placeholder:"e.g. 50000", default:"0"},
    {id:"cashSales", label:"Cash Sales", prefix:"₹", placeholder:"e.g. 120000", default:"0"},
    {id:"otherIncome", label:"Other Income", prefix:"₹", placeholder:"e.g. 5000", default:"0"},
    {id:"purchases", label:"Purchases", prefix:"₹", placeholder:"e.g. 40000", default:"0"},
    {id:"rent", label:"Rent", prefix:"₹", placeholder:"e.g. 15000", default:"0"},
    {id:"salaries", label:"Salaries", prefix:"₹", placeholder:"e.g. 30000", default:"0"},
    {id:"utilities", label:"Utilities", prefix:"₹", placeholder:"e.g. 5000", default:"0"},
    {id:"marketing", label:"Marketing", prefix:"₹", placeholder:"e.g. 8000", default:"0"},
    {id:"loanPayments", label:"Loan Payments", prefix:"₹", placeholder:"e.g. 10000", default:"0"},
    {id:"otherExpenses", label:"Other Expenses", prefix:"₹", placeholder:"e.g. 3000", default:"0"},
  ],
  validate(v){
    const e={}; const ids=["opening","cashSales","otherIncome","purchases","rent","salaries","utilities","marketing","loanPayments","otherExpenses"];
    ids.forEach(id=>{ if(!(v[id]>=0)) e[id]="This cannot be negative."; });
    return e;
  },
  compute(v){
    const inflow=v.cashSales+v.otherIncome;
    const outflow=v.purchases+v.rent+v.salaries+v.utilities+v.marketing+v.loanPayments+v.otherExpenses;
    const net=inflow-outflow, closing=v.opening+net, negative=net<0;
    return {
      hero:{label:"Closing Cash", value:formatMoney(closing), negative: closing<0},
      grid:[{label:"Total Cash Inflow", value:formatMoney(inflow), tone:"teal"},{label:"Total Cash Outflow", value:formatMoney(outflow), tone:"amber"},{label:"Net Cash Flow", value:formatMoney(net), tone:negative?"danger":"teal"},{label:"Opening Cash", value:formatMoney(v.opening)}],
      summaryText:`Cash Flow Calculator — Inflow ${formatMoney(inflow)}, Outflow ${formatMoney(outflow)}. Net Cash Flow: ${formatMoney(net)}, Closing Cash: ${formatMoney(closing)}.`,
      csvRows:[["Metric","Value"],["Opening Cash",v.opening],["Cash Sales",v.cashSales],["Other Income",v.otherIncome],["Purchases",v.purchases],["Rent",v.rent],["Salaries",v.salaries],["Utilities",v.utilities],["Marketing",v.marketing],["Loan Payments",v.loanPayments],["Other Expenses",v.otherExpenses],["Total Cash Inflow",inflow.toFixed(2)],["Total Cash Outflow",outflow.toFixed(2)],["Net Cash Flow",net.toFixed(2)],["Closing Cash",closing.toFixed(2)]],
      recentResult:`Closing Cash ${formatMoney(closing)}`
    };
  },
  formula_eq:"Total Cash Inflow = Cash Sales + Other Income\nTotal Cash Outflow = Purchases + Rent + Salaries + Utilities + Marketing + Loan Payments + Other Expenses\nNet Cash Flow = Total Inflow − Total Outflow\nClosing Cash = Opening Cash + Net Cash Flow",
  formula_vars:[["Total Cash Inflow","everything coming in this month"],["Total Cash Outflow","everything going out this month"],["Closing Cash","opening cash plus the net change"]],
  tips:["A negative net cash flow doesn't always mean trouble if opening cash is large enough to absorb it.","Recalculate monthly so opening cash matches last month's closing cash.","Separating fixed costs like rent from variable ones like marketing helps you spot where to cut first."],
  faqs:[["What's the difference between net cash flow and closing cash?","Net cash flow is the change this month; closing cash is your running balance."],["Why is this different from profit?","Cash flow tracks money actually moving, while profit includes non-cash items."],["What if outflow exceeds inflow every month?","Closing cash keeps shrinking — a warning sign to catch early."]],
  related:["business-expense","revenue","business-roi"]
});

CALC_DEFS.push({
  id:"inventory", name:"Inventory Calculator", slug:"inventory-calculator", category:"Operations",
  desc:"Calculate closing inventory, inventory value and cost of goods sold.",
  keywords:["inventory","stock","cogs"],
  inputs:[
    {id:"opening", label:"Opening Inventory (units)", placeholder:"e.g. 200"},
    {id:"purchases", label:"Purchases (units)", placeholder:"e.g. 300", default:"0"},
    {id:"sold", label:"Units Sold", placeholder:"e.g. 350", default:"0"},
    {id:"costPerUnit", label:"Cost Per Unit", prefix:"₹", placeholder:"e.g. 120"},
  ],
  validate(v){
    const e={};
    if(!(v.opening>=0)) e.opening="Opening inventory cannot be negative.";
    if(!(v.purchases>=0)) e.purchases="Purchases cannot be negative.";
    if(!(v.sold>=0)) e.sold="Units sold cannot be negative.";
    if(!(v.costPerUnit>0)) e.costPerUnit="Cost per unit must be greater than 0.";
    return e;
  },
  compute(v){
    const closing=v.opening+v.purchases-v.sold;
    const inventoryValue=closing*v.costPerUnit, cogs=v.sold*v.costPerUnit;
    return {
      warning: closing<0 ? "Units sold exceed opening inventory plus purchases. Please check your numbers — closing inventory can't be negative." : null,
      hero:{label:"Closing Inventory", value:formatNumber(closing)+" units", negative:closing<0},
      grid:[{label:"Inventory Value", value:formatMoney(Math.max(0,inventoryValue))},{label:"Cost of Goods Sold", value:formatMoney(cogs)},{label:"Opening Inventory", value:formatNumber(v.opening)+" units"},{label:"Purchases", value:formatNumber(v.purchases)+" units"}],
      summaryText:`Inventory Calculator — Opening ${v.opening}, Purchases ${v.purchases}, Sold ${v.sold}. Closing: ${closing} units, Value: ${formatMoney(inventoryValue)}, COGS: ${formatMoney(cogs)}.`,
      csvRows:[["Metric","Value"],["Opening Inventory",v.opening],["Purchases",v.purchases],["Units Sold",v.sold],["Cost Per Unit",v.costPerUnit],["Closing Inventory",closing],["Inventory Value",inventoryValue.toFixed(2)],["Cost of Goods Sold",cogs.toFixed(2)]],
      recentResult:`Closing ${closing} units`
    };
  },
  formula_eq:"Closing Inventory = Opening Inventory + Purchases − Units Sold\nInventory Value = Closing Inventory × Cost Per Unit\nCost of Goods Sold = Units Sold × Cost Per Unit",
  formula_vars:[["Closing Inventory","units left in stock after purchases and sales"],["Inventory Value","the rupee value of stock currently on hand"],["Cost of Goods Sold (COGS)","the cost of the units you actually sold"]],
  tips:["A negative closing inventory means recorded sales exceeded available stock — double-check your figures.","Use a consistent average cost per unit if purchase prices vary between batches.","COGS here is a simple units × cost estimate — for FIFO/LIFO, track batches separately."],
  faqs:[["What does closing inventory mean?","Stock left after adding purchases to opening stock and subtracting what you sold."],["How is COGS calculated here?","Units sold multiplied by cost per unit — a simple average-cost method."],["What if closing inventory is negative?","Units sold exceeded opening stock plus purchases — recheck your numbers."]],
  related:["stock-reorder","business-expense","profit-margin"]
});

CALC_DEFS.push({
  id:"stock-reorder", name:"Stock Reorder Calculator", slug:"stock-reorder-calculator", category:"Operations",
  desc:"Find your reorder point from average daily sales, lead time and safety stock.",
  keywords:["reorder point","stock","safety stock"],
  inputs:[
    {id:"dailySales", label:"Average Daily Sales (units)", placeholder:"e.g. 12"},
    {id:"leadTime", label:"Lead Time (days)", hint:"Days between placing an order and receiving stock.", placeholder:"e.g. 7"},
    {id:"safetyStock", label:"Safety Stock (units)", placeholder:"e.g. 20", default:"0"},
    {id:"currentStock", label:"Current Stock (units)", placeholder:"e.g. 90"},
  ],
  validate(v){
    const e={};
    if(!(v.dailySales>=0)) e.dailySales="Average daily sales cannot be negative.";
    if(!(v.leadTime>=0)) e.leadTime="Lead time cannot be negative.";
    if(!(v.safetyStock>=0)) e.safetyStock="Safety stock cannot be negative.";
    if(!(v.currentStock>=0)) e.currentStock="Current stock cannot be negative.";
    return e;
  },
  compute(v){
    const reorderPoint=(v.dailySales*v.leadTime)+v.safetyStock;
    const needsReorder=v.currentStock<=reorderPoint;
    return {
      hero:{label:"Reorder Point", value:formatNumber(Math.ceil(reorderPoint))+" units"},
      grid:[{label:"Current Stock", value:formatNumber(v.currentStock)+" units"},{label:"Status", value: needsReorder?"Reorder Now":"Stock Level OK", tone:needsReorder?"danger":"teal"},{label:"Lead Time Demand", value:formatNumber(v.dailySales*v.leadTime)+" units"},{label:"Safety Stock", value:formatNumber(v.safetyStock)+" units"}],
      summaryText:`Stock Reorder Calculator — Reorder Point: ${Math.ceil(reorderPoint)} units. Current Stock: ${v.currentStock}. Status: ${needsReorder?"Reorder Now":"Stock Level OK"}.`,
      csvRows:[["Metric","Value"],["Average Daily Sales",v.dailySales],["Lead Time (days)",v.leadTime],["Safety Stock",v.safetyStock],["Current Stock",v.currentStock],["Reorder Point",Math.ceil(reorderPoint)],["Status",needsReorder?"Reorder Now":"Stock Level OK"]],
      recentResult: needsReorder ? "Reorder Now" : "Stock Level OK"
    };
  },
  formula_eq:"Reorder Point = (Average Daily Sales × Lead Time) + Safety Stock",
  formula_vars:[["Reorder Point","the stock level at which you should place a new order"],["Safety Stock","a buffer to cover unexpected demand or delays"]],
  tips:["Base average daily sales on a recent, representative period.","Increase safety stock for products with unreliable suppliers or seasonal demand.","Recalculate whenever lead time changes, such as a new supplier."],
  faqs:[["What is a reorder point?","The stock level at which you should order so stock doesn't run out before the new order arrives."],["What is safety stock for?","A buffer above the strict minimum to protect against demand spikes or delays."],["How do I know my lead time?","The typical days between placing an order and receiving it — check past orders for an average."]],
  related:["inventory","revenue","business-expense"]
});

CALC_DEFS.push({
  id:"salary-cost", name:"Salary / Employee Cost Calculator", slug:"salary-cost-calculator", category:"Operations",
  desc:"Calculate gross salary, total employer cost and cost per working hour.",
  keywords:["salary","employee cost","payroll"],
  inputs:[
    {id:"basic", label:"Basic Salary (monthly)", prefix:"₹", placeholder:"e.g. 25000"},
    {id:"allowances", label:"Allowances (monthly)", prefix:"₹", placeholder:"e.g. 5000", default:"0"},
    {id:"bonus", label:"Bonus (monthly average)", prefix:"₹", placeholder:"e.g. 2000", default:"0"},
    {id:"employerContrib", label:"Employer Contributions (PF, ESI etc.)", prefix:"₹", placeholder:"e.g. 3000", default:"0"},
    {id:"benefits", label:"Other Benefits", hint:"Insurance, meals, transport provided by employer.", prefix:"₹", placeholder:"e.g. 1500", default:"0"},
    {id:"hours", label:"Working Hours Per Month", placeholder:"e.g. 208", default:"208"},
  ],
  validate(v){
    const e={};
    if(!(v.basic>0)) e.basic="Basic salary must be greater than 0.";
    if(!(v.allowances>=0)) e.allowances="Allowances cannot be negative.";
    if(!(v.bonus>=0)) e.bonus="Bonus cannot be negative.";
    if(!(v.employerContrib>=0)) e.employerContrib="Employer contributions cannot be negative.";
    if(!(v.benefits>=0)) e.benefits="Benefits cannot be negative.";
    if(!(v.hours>0)) e.hours="Working hours must be greater than 0.";
    return e;
  },
  compute(v){
    const grossSalary=v.basic+v.allowances+v.bonus;
    const monthlyEmployerCost=grossSalary+v.employerContrib+v.benefits;
    const annualEmployerCost=monthlyEmployerCost*12, costPerHour=monthlyEmployerCost/v.hours;
    return {
      hero:{label:"Monthly Employer Cost", value:formatMoney(monthlyEmployerCost)},
      grid:[{label:"Gross Salary (Employee)", value:formatMoney(grossSalary), tone:"teal"},{label:"Annual Employer Cost", value:formatMoney(annualEmployerCost)},{label:"Cost Per Working Hour", value:formatMoney(costPerHour)},{label:"Employer Add-ons", value:formatMoney(v.employerContrib+v.benefits), tone:"amber"}],
      summaryText:`Salary / Employee Cost Calculator — Gross Salary: ${formatMoney(grossSalary)}, Monthly Employer Cost: ${formatMoney(monthlyEmployerCost)}.`,
      csvRows:[["Metric","Value"],["Basic Salary",v.basic],["Allowances",v.allowances],["Bonus",v.bonus],["Employer Contributions",v.employerContrib],["Benefits",v.benefits],["Working Hours",v.hours],["Gross Salary",grossSalary.toFixed(2)],["Monthly Employer Cost",monthlyEmployerCost.toFixed(2)],["Annual Employer Cost",annualEmployerCost.toFixed(2)],["Cost Per Working Hour",costPerHour.toFixed(2)]],
      recentResult:`Employer Cost ${formatMoney(monthlyEmployerCost)}/mo`
    };
  },
  formula_eq:"Gross Salary = Basic + Allowances + Bonus\nMonthly Employer Cost = Gross Salary + Employer Contributions + Benefits\nAnnual Employer Cost = Monthly Employer Cost × 12\nCost Per Working Hour = Monthly Employer Cost ÷ Working Hours",
  formula_vars:[["Gross Salary","what the employee sees on their payslip"],["Monthly Employer Cost","the true monthly cost of employing this person"],["Cost Per Working Hour","employer cost divided across monthly working hours"]],
  tips:["Gross salary is what the employee sees; employer cost is what the business actually pays.","Include PF, ESI, gratuity accrual and insurance in Employer Contributions.","Use cost per working hour when pricing services or deciding whether to hire versus outsource."],
  faqs:[["What's the difference between gross salary and employer cost?","Gross salary is basic + allowances + bonus. Employer cost adds employer-side contributions and benefits."],["What should I include in Employer Contributions?","Statutory costs like PF, ESI, and gratuity accrual."],["Why calculate cost per working hour?","Useful for pricing billable work or comparing against outsourcing."]],
  related:["business-expense","business-roi","commission"]
});

CALC_DEFS.push({
  id:"business-expense", name:"Business Expense Calculator", slug:"business-expense-calculator", category:"Business Planning",
  desc:"Add up expenses by category to get monthly, annual and daily totals.",
  keywords:["expenses","costs","budget"],
  inputs:[
    {id:"rent", label:"Rent", prefix:"₹", placeholder:"e.g. 20000", default:"0"},
    {id:"salary", label:"Salary", prefix:"₹", placeholder:"e.g. 60000", default:"0"},
    {id:"electricity", label:"Electricity", prefix:"₹", placeholder:"e.g. 4000", default:"0"},
    {id:"internet", label:"Internet", prefix:"₹", placeholder:"e.g. 1500", default:"0"},
    {id:"marketing", label:"Marketing", prefix:"₹", placeholder:"e.g. 8000", default:"0"},
    {id:"transport", label:"Transport", prefix:"₹", placeholder:"e.g. 3000", default:"0"},
    {id:"inventory", label:"Inventory", prefix:"₹", placeholder:"e.g. 30000", default:"0"},
    {id:"loan", label:"Loan Payment", prefix:"₹", placeholder:"e.g. 10000", default:"0"},
    {id:"software", label:"Software / Subscriptions", prefix:"₹", placeholder:"e.g. 2000", default:"0"},
    {id:"other", label:"Other", prefix:"₹", placeholder:"e.g. 2500", default:"0"},
  ],
  validate(v){
    const e={}; const ids=["rent","salary","electricity","internet","marketing","transport","inventory","loan","software","other"];
    ids.forEach(id=>{ if(!(v[id]>=0)) e[id]="This cannot be negative."; });
    return e;
  },
  compute(v){
    const labels={rent:"Rent",salary:"Salary",electricity:"Electricity",internet:"Internet",marketing:"Marketing",transport:"Transport",inventory:"Inventory",loan:"Loan Payment",software:"Software",other:"Other"};
    const ids=Object.keys(labels);
    const total=ids.reduce((s,id)=>s+v[id],0), annual=total*12, daily=total/30;
    const topCategory=ids.reduce((a,b)=> v[a]>=v[b]?a:b);
    return {
      hero:{label:"Total Monthly Expenses", value:formatMoney(total)},
      grid:[{label:"Total Annual Expenses", value:formatMoney(annual)},{label:"Average Daily Expense", value:formatMoney(daily)},{label:"Largest Category", value:labels[topCategory]+" ("+formatMoney(v[topCategory])+")", tone:"amber"}],
      summaryText:`Business Expense Calculator — Total Monthly: ${formatMoney(total)}, Annual: ${formatMoney(annual)}, Daily Avg: ${formatMoney(daily)}.`,
      csvRows:[["Category","Value"]].concat(ids.map(id=>[labels[id],v[id]])).concat([["Total Monthly Expenses",total.toFixed(2)],["Total Annual Expenses",annual.toFixed(2)],["Average Daily Expense",daily.toFixed(2)]]),
      recentResult:`Total ${formatMoney(total)}/mo`
    };
  },
  formula_eq:"Total Monthly Expenses = sum of all categories\nTotal Annual Expenses = Total Monthly Expenses × 12\nAverage Daily Expense = Total Monthly Expenses ÷ 30",
  formula_vars:[["Total Monthly Expenses","every category added together"],["Total Annual Expenses","monthly total projected across 12 months"],["Average Daily Expense","monthly total spread across a 30-day month"]],
  tips:["Leave any category at 0 if it doesn't apply to your business.","Review this monthly — marketing and software often creep up unnoticed.","Compare total monthly expenses against your break-even revenue."],
  faqs:[["Can I add my own expense categories?","Use the Other field to combine anything that doesn't fit elsewhere."],["How is the daily average calculated?","Total monthly expenses divided by 30."],["Why track annual expenses separately?","Useful for budgeting, loan applications, and year-over-year comparisons."]],
  related:["cash-flow","break-even","salary-cost"]
});

CALC_DEFS.push({
  id:"target-sales", name:"Target Sales Calculator", slug:"target-sales-calculator", category:"Business Planning",
  desc:"Calculate the units and revenue needed to hit a desired profit.",
  keywords:["target sales","sales goal"],
  inputs:[
    {id:"fixed", label:"Fixed Costs", prefix:"₹", placeholder:"e.g. 40000"},
    {id:"price", label:"Selling Price Per Unit", prefix:"₹", placeholder:"e.g. 500"},
    {id:"varCost", label:"Variable Cost Per Unit", prefix:"₹", placeholder:"e.g. 300"},
    {id:"profit", label:"Desired Profit", prefix:"₹", placeholder:"e.g. 30000"},
    {id:"periodDays", label:"Target Period (days)", hint:"e.g. 30 for a month, 7 for a week.", placeholder:"e.g. 30", default:"30"},
  ],
  validate(v){
    const e={};
    if(!(v.fixed>=0)) e.fixed="Fixed costs cannot be negative.";
    if(!(v.price>0)) e.price="Selling price must be greater than 0.";
    if(!(v.varCost>=0)) e.varCost="Variable cost cannot be negative.";
    if(!(v.profit>=0)) e.profit="Desired profit cannot be negative.";
    if(!(v.periodDays>0)) e.periodDays="Target period must be greater than 0 days.";
    return e;
  },
  compute(v){
    const contribution=v.price-v.varCost;
    if(contribution<=0){
      return {error:"Selling price must be greater than variable cost — otherwise no sales volume can reach your target."};
    }
    const requiredUnits=(v.fixed+v.profit)/contribution, requiredRevenue=requiredUnits*v.price;
    const dailyTarget=requiredUnits/v.periodDays, weeklyTarget=dailyTarget*7, monthlyTarget=dailyTarget*30;
    return {
      hero:{label:"Required Units", value:formatNumber(Math.ceil(requiredUnits))+" units"},
      grid:[{label:"Required Revenue", value:formatMoney(requiredRevenue)},{label:"Daily Sales Target", value:formatNumber(Math.ceil(dailyTarget))+" units"},{label:"Weekly Sales Target", value:formatNumber(Math.ceil(weeklyTarget))+" units"},{label:"Monthly Sales Target", value:formatNumber(Math.ceil(monthlyTarget))+" units"}],
      summaryText:`Target Sales Calculator — Required Units: ${Math.ceil(requiredUnits)}, Required Revenue: ${formatMoney(requiredRevenue)}.`,
      csvRows:[["Metric","Value"],["Fixed Costs",v.fixed],["Selling Price",v.price],["Variable Cost",v.varCost],["Desired Profit",v.profit],["Period (days)",v.periodDays],["Required Units",Math.ceil(requiredUnits)],["Required Revenue",requiredRevenue.toFixed(2)],["Daily Sales Target",Math.ceil(dailyTarget)],["Weekly Sales Target",Math.ceil(weeklyTarget)],["Monthly Sales Target",Math.ceil(monthlyTarget)]],
      recentResult:`${Math.ceil(requiredUnits)} units needed`
    };
  },
  formula_eq:"Contribution Per Unit = Selling Price − Variable Cost\nRequired Units = (Fixed Costs + Desired Profit) ÷ Contribution Per Unit\nRequired Revenue = Required Units × Selling Price\nDaily Target = Required Units ÷ Period Days",
  formula_vars:[["Contribution Per Unit","profit each unit contributes before fixed costs are covered"],["Required Units","total units needed to cover fixed costs and hit your profit goal"],["Daily / Weekly / Monthly Target","required units spread across your chosen period"]],
  tips:["If the daily target looks unrealistic, consider raising price, cutting cost, or extending the period.","Fixed costs should reflect the same period as your target.","This assumes every unit sells at the same price — adjust for discounts separately."],
  faqs:[["How is 'required units' different from break-even units?","Break-even covers fixed costs only; required units also add your desired profit."],["What period should I use?","Match it to how your fixed costs are measured — 30 days for monthly, 7 for weekly."],["What if selling price is less than variable cost?","No sales volume can reach your target — the price or cost needs to change first."]],
  related:["break-even","business-goal","revenue"]
});

CALC_DEFS.push({
  id:"business-goal", name:"Business Goal Calculator", slug:"business-goal-calculator", category:"Business Planning",
  desc:"See the revenue gap, growth % and extra sales needed to hit your target.",
  keywords:["business goal","growth","revenue gap"],
  inputs:[
    {id:"curRevenue", label:"Current Monthly Revenue", prefix:"₹", placeholder:"e.g. 200000"},
    {id:"targetRevenue", label:"Target Monthly Revenue", prefix:"₹", placeholder:"e.g. 300000"},
    {id:"avgSale", label:"Average Profit Per Sale", hint:"Average profit earned on one sale.", prefix:"₹", placeholder:"e.g. 400"},
    {id:"avgPrice", label:"Average Selling Price", prefix:"₹", placeholder:"e.g. 1200"},
  ],
  validate(v){
    const e={};
    if(!(v.curRevenue>=0)) e.curRevenue="Current revenue cannot be negative.";
    if(!(v.targetRevenue>=0)) e.targetRevenue="Target revenue cannot be negative.";
    if(!(v.avgSale>=0)) e.avgSale="Average profit per sale cannot be negative.";
    if(!(v.avgPrice>0)) e.avgPrice="Average selling price must be greater than 0.";
    return e;
  },
  compute(v){
    const revenueGap=Math.max(0,v.targetRevenue-v.curRevenue);
    const requiredSales=revenueGap/v.avgPrice, profitGap=requiredSales*v.avgSale;
    const growthPct = v.curRevenue>0 ? (revenueGap/v.curRevenue)*100 : (revenueGap>0?100:0);
    const weeklySales=requiredSales/4.3, dailySales=requiredSales/26;
    return {
      warning: v.targetRevenue<=v.curRevenue ? "Your target revenue is already at or below your current revenue — you've met this goal. Try setting a higher target." : null,
      hero:{label:"Revenue Gap", value:formatMoney(revenueGap)},
      grid:[{label:"Required Additional Sales", value:formatNumber(Math.ceil(requiredSales))},{label:"Profit Gap", value:formatMoney(profitGap)},{label:"Required Growth", value:formatPercent(growthPct)},{label:"Required Weekly Sales", value:formatNumber(Math.ceil(weeklySales))},{label:"Required Daily Sales", value:formatNumber(Math.ceil(dailySales))}],
      summaryText:`Business Goal Calculator — Revenue Gap: ${formatMoney(revenueGap)}, Required Sales: ${Math.ceil(requiredSales)}, Growth Needed: ${formatPercent(growthPct)}.`,
      csvRows:[["Metric","Value"],["Current Monthly Revenue",v.curRevenue],["Target Monthly Revenue",v.targetRevenue],["Average Profit Per Sale",v.avgSale],["Average Selling Price",v.avgPrice],["Revenue Gap",revenueGap.toFixed(2)],["Required Additional Sales",Math.ceil(requiredSales)],["Profit Gap",profitGap.toFixed(2)],["Required Growth %",growthPct.toFixed(2)],["Required Weekly Sales",Math.ceil(weeklySales)],["Required Daily Sales",Math.ceil(dailySales)]],
      recentResult:`Gap ${formatMoney(revenueGap)}`
    };
  },
  formula_eq:"Revenue Gap = Target Revenue − Current Revenue\nRequired Additional Sales = Revenue Gap ÷ Average Selling Price\nRequired Growth % = (Revenue Gap ÷ Current Revenue) × 100\nRequired Weekly Sales = Additional Sales ÷ 4.3\nRequired Daily Sales = Additional Sales ÷ 26",
  formula_vars:[["Revenue Gap","how much more monthly revenue you need"],["Required Additional Sales","extra units/orders needed at your average price"],["Required Growth %","the revenue gap as a percentage of your current revenue"]],
  tips:["Weekly and daily targets assume roughly 4.3 selling weeks and 26 selling days per month.","A very high required growth % may call for a longer timeline rather than a single push.","Pair this with the Break-Even or Target Sales calculator to check the extra sales are actually profitable."],
  faqs:[["What if my current revenue is already above target?","The revenue gap shows as zero — consider setting a higher target."],["How are weekly and daily targets calculated?","Required sales divided by approximately 4.3 weeks and 26 working days."],["Does this account for profit, not just revenue?","The Average Profit Per Sale field shows the profit impact of closing the gap."]],
  related:["target-sales","revenue","break-even"]
});

/* Build TOOLS list (metadata-only) used by search, listings, related-tools */
const TOOLS = CALC_DEFS.map(c => ({id:c.id, name:c.name, slug:c.slug, category:c.category, desc:c.desc, keywords:c.keywords}));
/* ============================================================
   Part 3: Generic calculator view — renders any CALC_DEFS entry
   ============================================================ */

let CURRENT_CALC_STATE = null; // {def, mode, lastValues, summaryText, csvRows, toolId}

function fieldHtml(f, mode, def){
  const fid = f.id;
  let label = f.label;
  if(def.modes && def.modes.labelOverride && def.modes.labelOverride[fid]){
    label = def.modes.labelOverride[fid][mode] || label;
  }
  const hint = f.hint || "";
  const hidden = f.showIf ? (f.showIf.field && f.showIf.equals !== undefined) : false;
  const style = f.showIf ? "" : "";
  if(f.type === "select"){
    const opts = f.options.map(([val,lbl]) => `<option value="${val}"${val===f.default?" selected":""}>${lbl}</option>`).join("");
    return `<div class="field" id="field-${fid}" data-showif="${f.showIf ? f.showIf.field+'='+f.showIf.equals : ''}">
      <label for="${fid}">${label}</label>
      ${hint ? `<div class="hint">${hint}</div>` : ""}
      <select class="mode-select" id="${fid}">${opts}</select>
    </div>`;
  }
  const prefix = f.prefix ? `<span class="prefix">${f.prefix}</span>` : "";
  const suffix = f.suffix ? `<span class="suffix">${f.suffix}</span>` : "";
  const val = f.default !== undefined ? f.default : "";
  return `<div class="field" id="field-${fid}" data-showif="${f.showIf ? f.showIf.field+'='+f.showIf.equals : ''}">
    <label for="${fid}">${label}</label>
    ${hint ? `<div class="hint">${hint}</div>` : ""}
    <div class="input-wrap">${prefix}<input type="number" inputmode="decimal" step="any" id="${fid}" placeholder="${f.placeholder||''}" value="${val}">${suffix}</div>
    <div class="field-error"></div>
  </div>`;
}

function renderCalculatorView(def){
  const modeToggleHtml = def.modes ? `<div class="mode-toggle" id="mode-toggle">
    ${def.modes.options.map(([id,label],i)=>`<button type="button" class="${i===0?'active':''}" data-mode="${id}">${label}</button>`).join("")}
  </div>` : "";

  const fieldsHtml = def.inputs.map(f => fieldHtml(f, def.modes ? def.modes.default : null, def)).join("");
  const formulaVarsHtml = def.formula_vars.map(([v,d])=>`<li><strong>${v}</strong> — ${d}</li>`).join("");
  const tipsHtml = def.tips.map(t=>`<li>${t}</li>`).join("");
  const faqsHtml = def.faqs.map(([q,a])=>`<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join("");
  const relatedHtml = def.related.map(id => {
    const t = TOOLS.find(x=>x.id===id);
    if(!t) return "";
    return `<a class="tool-card" href="#/tools/${t.slug}"><div class="tool-icon">${t.category[0]}</div><h3>${t.name}</h3><p>${t.desc}</p><span class="go">Calculate &rarr;</span></a>`;
  }).join("");

  return `
    <div class="calc-head">
      <h1>${def.name}</h1>
      <p class="desc">${def.desc}</p>
    </div>
    <div class="calc-grid">
      <div class="panel">
        <h2>Enter your numbers</h2>
        <div class="notice" id="notice"></div>
        ${modeToggleHtml}
        <form id="calc-form" onsubmit="return false;">
          ${fieldsHtml}
          <div class="field-actions">
            <button type="button" class="btn btn-primary btn-block" id="calc-btn">Calculate</button>
            <button type="button" class="btn btn-outline" id="reset-btn">Reset</button>
          </div>
        </form>
      </div>
      <div class="panel panel-sticky">
        <h2>Results</h2>
        <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
          <select class="mode-select" id="currency-select" style="width:auto;padding:6px 10px;font-size:13px;">
            <option value="INR">₹ INR</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="GBP">£ GBP</option><option value="AED">د.إ AED</option>
          </select>
        </div>
        <div id="results"><p class="results-empty">Fill in the fields on the left and press Calculate to see your results here.</p></div>
        <div class="result-actions" id="result-actions" style="display:none;">
          <button class="btn btn-sm btn-outline" id="copy-btn">Copy result</button>
          <button class="btn btn-sm btn-outline" id="share-btn">Share</button>
          <button class="btn btn-sm btn-outline" id="print-btn">Print</button>
          <button class="btn btn-sm btn-outline" id="csv-btn">Export CSV</button>
          <button class="btn btn-sm btn-outline" id="save-btn">Save calculation</button>
        </div>
      </div>
    </div>
    <div class="formula-card">
      <h2>How it's calculated</h2>
      <div class="formula-eq">${def.formula_eq}</div>
      <ul class="formula-vars">${formulaVarsHtml}</ul>
    </div>
    <div class="tips-card"><h3>Tips</h3><ul>${tipsHtml}</ul></div>
    <section style="padding-top:32px;"><h2>Frequently asked questions</h2>${faqsHtml}</section>
    <section style="padding-top:8px;padding-bottom:48px;"><h2>Related business tools</h2><div class="related-grid">${relatedHtml}</div></section>
  `;
}

function wireCalculatorView(def){
  let mode = def.modes ? def.modes.default : null;
  const notice = document.getElementById("notice");

  function syncShowIf(){
    document.querySelectorAll("[data-showif]").forEach(el=>{
      const cond = el.getAttribute("data-showif");
      if(!cond){ return; }
      const [fid, val] = cond.split("=");
      const src = document.getElementById(fid);
      if(!src) return;
      el.style.display = (src.value === val) ? "block" : "none";
    });
  }
  syncShowIf();
  def.inputs.forEach(f=>{
    if(f.type==="select"){
      document.getElementById(f.id).addEventListener("change", syncShowIf);
    }
  });

  if(def.modes){
    document.querySelectorAll("#mode-toggle button").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        document.querySelectorAll("#mode-toggle button").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        mode = btn.getAttribute("data-mode");
        def.inputs.forEach(f=>{
          if(def.modes.labelOverride && def.modes.labelOverride[f.id]){
            const lbl = document.querySelector(`label[for="${f.id}"]`);
            if(lbl) lbl.textContent = def.modes.labelOverride[f.id][mode] || f.label;
          }
        });
      });
    });
  }

  function collectValues(){
    const v = {};
    def.inputs.forEach(f=>{
      const el = document.getElementById(f.id);
      if(f.type==="select"){ v[f.id] = el.value; }
      else { v[f.id] = num(el.value === "" ? (f.default !== undefined ? f.default : "") : el.value); }
    });
    return v;
  }

  function calculate(){
    hideNotice();
    const v = collectValues();
    const errors = def.validate(v, mode) || {};
    let ok = true;
    def.inputs.forEach(f=>{
      const fieldEl = document.getElementById("field-"+f.id);
      if(errors[f.id]){
        fieldEl.classList.add("invalid");
        fieldEl.querySelector(".field-error") && (fieldEl.querySelector(".field-error").textContent = errors[f.id]);
        ok = false;
      } else {
        fieldEl.classList.remove("invalid");
      }
    });
    if(!ok) return;

    const result = def.compute(v, mode);
    if(result.error){
      showNotice(result.error);
      document.getElementById("results").innerHTML = '<p class="results-empty">Fix the inputs above to see your result here.</p>';
      document.getElementById("result-actions").style.display = "none";
      return;
    }
    if(result.warning) showNotice(result.warning);

    let html = renderHero(result.hero.label, result.hero.value, result.hero.negative);
    html += renderGrid(result.grid);
    if(result.chartHtml) html += result.chartHtml;
    document.getElementById("results").innerHTML = html;
    document.getElementById("result-actions").style.display = "flex";

    CURRENT_CALC_STATE = {toolId:def.id, toolName:def.name, summaryText:result.summaryText, csvRows:result.csvRows, values:v};
    addRecent({toolId:def.id, toolName:def.name, slug:def.slug, result:result.recentResult});
  }

  function showNotice(msg){ notice.textContent = msg; notice.classList.add("show"); }
  function hideNotice(){ notice.classList.remove("show"); }

  document.getElementById("calc-btn").addEventListener("click", calculate);
  def.inputs.forEach(f=>{
    const el = document.getElementById(f.id);
    el.addEventListener("keydown", e=>{ if(e.key==="Enter") calculate(); });
  });

  document.getElementById("reset-btn").addEventListener("click", ()=>{
    document.querySelectorAll("#calc-form input[type=number]").forEach(i=>{
      const f = def.inputs.find(x=>x.id===i.id);
      i.value = f && f.default !== undefined ? f.default : "";
    });
    document.querySelectorAll(".field").forEach(f=>f.classList.remove("invalid"));
    document.getElementById("results").innerHTML = '<p class="results-empty">Fill in the fields on the left and press Calculate to see your results here.</p>';
    document.getElementById("result-actions").style.display = "none";
    hideNotice();
    CURRENT_CALC_STATE = null;
  });

  document.getElementById("copy-btn").addEventListener("click", ()=>{ if(CURRENT_CALC_STATE) copyText(CURRENT_CALC_STATE.summaryText); });
  document.getElementById("share-btn").addEventListener("click", ()=>{ if(CURRENT_CALC_STATE) shareText(CURRENT_CALC_STATE.toolName, CURRENT_CALC_STATE.summaryText); });
  document.getElementById("print-btn").addEventListener("click", printPage);
  document.getElementById("csv-btn").addEventListener("click", ()=>{ if(CURRENT_CALC_STATE) exportCSV(CURRENT_CALC_STATE.toolId+"-result.csv", CURRENT_CALC_STATE.csvRows); });
  document.getElementById("save-btn").addEventListener("click", ()=>{
    if(!CURRENT_CALC_STATE) return;
    const name = prompt("Name this calculation:", CURRENT_CALC_STATE.toolName+" — "+new Date().toLocaleDateString("en-IN"));
    if(name){ saveHistoryEntry(CURRENT_CALC_STATE.toolId, name, CURRENT_CALC_STATE.values); toast("Calculation saved"); }
  });

  const curSel = document.getElementById("currency-select");
  curSel.value = getCurrency();
  curSel.addEventListener("change", ()=>{ setCurrency(curSel.value); if(CURRENT_CALC_STATE) document.getElementById("calc-btn").click(); });

  document.querySelectorAll("[data-fav-toggle]").forEach(btn=>{
    const id = btn.getAttribute("data-fav-toggle");
    if(isFavorite(id)) btn.classList.add("active");
    btn.addEventListener("click", e=>{
      e.preventDefault(); e.stopPropagation();
      toggleFavorite(id);
      btn.classList.toggle("active");
      toast(isFavorite(id) ? "Added to favourites" : "Removed from favourites");
    });
  });
}

function renderHero(label, value, negative){
  return `<div class="result-hero${negative?" negative":""}"><div class="label">${label}</div><div class="value mono">${value}</div></div>`;
}
function renderGrid(items){
  return `<div class="result-grid">${items.map(it=>`<div class="result-item${it.tone?" ledger-tick ledger-tick--"+it.tone:""}"><div class="label">${it.label}</div><div class="value mono">${it.value}</div></div>`).join("")}</div>`;
}
/* ============================================================
   Part 4: Page views — home, tools list, dashboard, static pages
   ============================================================ */

function toolCardHtml(t){
  return `<a class="tool-card" href="#/tools/${t.slug}">
    <div style="display:flex;align-items:center;">
      <div class="tool-icon">${t.category[0]}</div>
      <button class="fav-btn" data-fav-toggle="${t.id}" aria-label="Save to favourites">&#9733;</button>
    </div>
    <h3>${t.name}</h3>
    <p>${t.desc}</p>
    <span class="cat-tag">${t.category}</span>
    <span class="go">Calculate &rarr;</span>
  </a>`;
}

function wireFavButtons(){
  document.querySelectorAll("[data-fav-toggle]").forEach(btn=>{
    const id = btn.getAttribute("data-fav-toggle");
    if(isFavorite(id)) btn.classList.add("active");
    btn.addEventListener("click", e=>{
      e.preventDefault(); e.stopPropagation();
      toggleFavorite(id);
      btn.classList.toggle("active");
      toast(isFavorite(id) ? "Added to favourites" : "Removed from favourites");
    });
  });
}

function wireSearch(rootSelector){
  const input = document.querySelector(rootSelector+" [data-search-input]");
  if(!input) return;
  const resultsEl = document.querySelector(rootSelector+" [data-search-results]");
  function run(){
    const q = input.value.trim().toLowerCase();
    if(!q){ resultsEl.classList.remove("open"); resultsEl.innerHTML=""; return; }
    const matches = TOOLS.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.keywords.some(k=>k.includes(q))).slice(0,8);
    resultsEl.innerHTML = matches.length===0
      ? `<div class="search-empty">No calculators match "${escapeHtml(input.value)}"</div>`
      : matches.map(t=>`<a href="#/tools/${t.slug}"><span>${t.name}</span><span class="cat">${t.category}</span></a>`).join("");
    resultsEl.classList.add("open");
  }
  input.addEventListener("input", run);
  input.addEventListener("focus", run);
  document.addEventListener("click", e=>{ if(!e.target.closest(rootSelector+" .search-box, "+rootSelector+" [data-search-results]")) resultsEl.classList.remove("open"); });
  document.querySelectorAll(rootSelector+" [data-search-chip]").forEach(chip=>{
    chip.addEventListener("click", ()=>{ input.value = chip.textContent.trim(); input.focus(); run(); });
  });
}

function viewHome(){
  const popularIds = ["profit-margin","gst","loan-emi","selling-price","break-even","discount"];
  document.getElementById("view-root").innerHTML = `
    <section class="hero" style="padding-top:24px;">
      <span class="hero-eyebrow">20 free calculators &middot; No sign-up</span>
      <h1>Smart calculators for smarter business decisions</h1>
      <p class="lede">Calculate pricing, profit, revenue, ROI, GST, EMI and more &mdash; quickly and accurately, right in your browser.</p>
      <div class="hero-actions">
        <a href="#/tools" class="btn btn-primary">Explore all tools</a>
        <a href="#popular" class="btn btn-outline">Popular calculators</a>
      </div>
      <div style="position:relative;max-width:560px;">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <input type="text" placeholder="What do you want to calculate?" data-search-input>
        </div>
        <div class="search-results" data-search-results></div>
      </div>
      <div class="search-hints">
        <span class="chip" data-search-chip>profit</span><span class="chip" data-search-chip>margin</span><span class="chip" data-search-chip>GST</span><span class="chip" data-search-chip>EMI</span><span class="chip" data-search-chip>break-even</span><span class="chip" data-search-chip>revenue</span>
      </div>
    </section>

    <section id="categories">
      <div class="section-head"><h2>Browse by category</h2><p class="sub">Every calculator is grouped so you can find the right one fast.</p></div>
      <div class="cat-grid">
        <a class="cat-card" href="#/tools/pricing"><span class="n">01</span><h3>Pricing</h3><p>Set prices, margins and markups with confidence.</p></a>
        <a class="cat-card" href="#/tools/finance"><span class="n">02</span><h3>Finance</h3><p>Tax, loans, revenue and returns.</p></a>
        <a class="cat-card" href="#/tools/business-planning"><span class="n">03</span><h3>Business Planning</h3><p>Break-even and growth targets.</p></a>
        <a class="cat-card" href="#/tools/operations"><span class="n">04</span><h3>Operations</h3><p>Day-to-day payouts and running numbers.</p></a>
      </div>
    </section>

    <section id="popular">
      <div class="section-head"><h2>Popular calculators</h2><p class="sub">Start with the tools businesses use most.</p></div>
      <div class="tool-grid">${TOOLS.filter(t=>popularIds.includes(t.id)).map(toolCardHtml).join("")}</div>
    </section>

    <section id="why">
      <div class="section-head"><h2>Why BusinessTools?</h2></div>
      <div class="why-grid">
        <div class="why-item"><h4>Fast calculations</h4><p>Results update instantly — no page reloads.</p></div>
        <div class="why-item"><h4>Accurate formulas</h4><p>Standard business formulas, shown openly so you can verify them.</p></div>
        <div class="why-item"><h4>Mobile friendly</h4><p>Built mobile-first so every input is easy to tap.</p></div>
        <div class="why-item"><h4>Free to use</h4><p>No sign-up, no paywall, no limits.</p></div>
        <div class="why-item"><h4>Easy to understand</h4><p>Every result comes with a plain-language explanation.</p></div>
        <div class="why-item"><h4>Built for small business</h4><p>Designed around the numbers shop owners and freelancers track.</p></div>
      </div>
    </section>

    <section id="how">
      <div class="section-head"><h2>How it works</h2></div>
      <div class="how-steps">
        <div class="how-step"><h4>Enter your numbers</h4><p>Cost, price, quantity — whatever the calculator needs.</p></div>
        <div class="how-step"><h4>Calculate</h4><p>Get an instant, clearly laid-out result.</p></div>
        <div class="how-step"><h4>Understand your result</h4><p>Read the plain-language explanation and formula.</p></div>
        <div class="how-step"><h4>Decide with confidence</h4><p>Save, share or export the numbers for later.</p></div>
      </div>
    </section>

    <section>
      <div class="cta-band">
        <h2>Choose a calculator and start planning smarter</h2>
        <p>Twenty calculators, one clean workspace.</p>
        <a href="#/tools" class="btn btn-primary">Explore all tools</a>
      </div>
    </section>
  `;
  document.getElementById("breadcrumb").innerHTML = "";
  wireFavButtons();
  wireSearch("#view-root");
}

function viewToolsList(scrollToCat){
  const cats = ["Pricing","Finance","Business Planning","Operations"];
  const catIds = {Pricing:"pricing", Finance:"finance", "Business Planning":"business-planning", Operations:"operations"};
  document.getElementById("view-root").innerHTML = `
    <section style="padding-top:24px;">
      <div class="section-head">
        <h1 style="font-size:clamp(26px,4vw,36px);">All Business Tools</h1>
        <p class="sub">20 calculators across pricing, finance, business planning and operations.</p>
      </div>
      <div style="position:relative;max-width:480px;margin-bottom:36px;">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <input type="text" placeholder="Search calculators..." data-search-input>
        </div>
        <div class="search-results" data-search-results></div>
      </div>
      ${cats.map(cat => `
        <div id="${catIds[cat]}" style="margin-top:32px;">
          <h2>${cat}</h2>
          <div class="tool-grid">${TOOLS.filter(t=>t.category===cat).map(toolCardHtml).join("")}</div>
        </div>
      `).join("")}
    </section>
  `;
  document.getElementById("breadcrumb").innerHTML = `<a href="#/">Home</a> &rsaquo; <span aria-current="page">All Tools</span>`;
  wireFavButtons();
  wireSearch("#view-root");
  if(scrollToCat && catIds[Object.keys(catIds).find(k=>catIds[k]===scrollToCat)] !== undefined){
    setTimeout(()=>{ const el = document.getElementById(scrollToCat); if(el) el.scrollIntoView({behavior:"smooth"}); }, 50);
  }
}

function viewCalculator(def){
  document.getElementById("breadcrumb").innerHTML = `<a href="#/">Home</a> &rsaquo; <a href="#/tools">All Tools</a> &rsaquo; <span aria-current="page">${def.name}</span>`;
  document.getElementById("view-root").innerHTML = renderCalculatorView(def);
  wireCalculatorView(def);
  document.title = def.name + " — BusinessTools";
}

function viewDashboard(){
  document.getElementById("breadcrumb").innerHTML = `<a href="#/">Home</a> &rsaquo; <span aria-current="page">Dashboard</span>`;
  document.getElementById("view-root").innerHTML = `
    <div class="section-head" style="padding-top:24px;">
      <h1 style="font-size:clamp(24px,4vw,32px);">Dashboard</h1>
      <p class="sub">Your favourites, recent calculations and quick links — stored only on this device.</p>
    </div>
    <div class="dash-grid">
      <div>
        <div class="panel" style="margin-bottom:24px;"><h2>Recent calculations</h2><div id="recents-list"></div></div>
        <div class="panel"><h2>Saved calculations</h2><div id="history-list"></div></div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:24px;"><h2>Favourite tools</h2><div id="favorites-list"></div></div>
        <div class="panel"><h2>Quick actions</h2>
          <div class="stack" style="gap:10px;">
            <a class="btn btn-outline btn-block" href="#/tools">Browse all tools</a>
            <button class="btn btn-outline btn-block" id="clear-recents-btn">Clear recent calculations</button>
          </div>
        </div>
      </div>
    </div>
  `;

  function renderFavorites(){
    const el = document.getElementById("favorites-list");
    const tools = TOOLS.filter(t => getFavorites().includes(t.id));
    el.innerHTML = tools.length===0
      ? '<div class="empty-state">No favourites yet. Tap the star on any calculator to save it here.</div>'
      : tools.map(t=>`<div class="hist-row"><div><div class="name"><a href="#/tools/${t.slug}">${t.name}</a></div><div class="meta">${t.category}</div></div><button class="btn btn-sm btn-ghost" data-unfav="${t.id}">Remove</button></div>`).join("");
    el.querySelectorAll("[data-unfav]").forEach(btn=>btn.addEventListener("click", ()=>{ toggleFavorite(btn.getAttribute("data-unfav")); renderFavorites(); }));
  }
  function renderRecents(){
    const el = document.getElementById("recents-list");
    const recents = getRecents();
    el.innerHTML = recents.length===0
      ? '<div class="empty-state">No recent calculations yet. They will show up here after you use a calculator.</div>'
      : recents.map(r=>`<div class="hist-row"><div><div class="name"><a href="#/tools/${r.slug}">${r.toolName}</a></div><div class="meta">${new Date(r.date).toLocaleString("en-IN")} · ${r.result}</div></div></div>`).join("");
  }
  function renderHistory(){
    const el = document.getElementById("history-list");
    const hist = getHistory();
    el.innerHTML = hist.length===0
      ? '<div class="empty-state">No saved calculations yet. Use "Save calculation" on any calculator to keep one here.</div>'
      : hist.map(h=>`<div class="hist-row"><div><div class="name">${h.name}</div><div class="meta">${new Date(h.date).toLocaleString("en-IN")}</div></div><div style="display:flex;gap:6px;"><button class="btn btn-sm btn-ghost" data-rename="${h.id}">Rename</button><button class="btn btn-sm btn-ghost" data-delete="${h.id}">Delete</button></div></div>`).join("");
    el.querySelectorAll("[data-rename]").forEach(btn=>btn.addEventListener("click", ()=>{
      const newName = prompt("Rename this calculation:");
      if(newName){ renameHistoryEntry(btn.getAttribute("data-rename"), newName); renderHistory(); }
    }));
    el.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click", ()=>{ deleteHistoryEntry(btn.getAttribute("data-delete")); renderHistory(); }));
  }
  document.getElementById("clear-recents-btn").addEventListener("click", ()=>{
    if(confirm("Clear all recent calculations?")){ clearRecents(); renderRecents(); toast("Recent calculations cleared"); }
  });
  renderFavorites(); renderRecents(); renderHistory();
}

function viewStatic(title, breadcrumbLabel, innerHtml){
  document.getElementById("breadcrumb").innerHTML = `<a href="#/">Home</a> &rsaquo; <span aria-current="page">${breadcrumbLabel}</span>`;
  document.getElementById("view-root").innerHTML = `<div style="padding:24px 0 60px;max-width:760px;">${innerHtml}</div>`;
  document.title = title + " — BusinessTools";
}

function viewAbout(){
  viewStatic("About", "About", `
    <h1>About BusinessTools</h1>
    <p>BusinessTools is a free suite of calculators built for entrepreneurs, shop owners, freelancers, retailers, wholesalers and students who need quick, accurate business numbers without opening a spreadsheet.</p>
    <p>Every calculator runs entirely in your browser. Your inputs are processed on your device — nothing is sent to a server, and no account is required to use any tool.</p>
    <h2>What you'll find here</h2>
    <p>Pricing tools for margin, markup and selling price. Finance tools for GST, loan EMI, revenue and ROI. Business planning tools for break-even, target sales and business goals. And operations tools for inventory, stock reorder, salary cost and commission.</p>
    <h2>Our approach</h2>
    <p>Every result comes with the formula behind it, shown openly, so you can verify the math or learn how it works. We don't use fake statistics, testimonials, or invented market data anywhere on this site.</p>
  `);
}
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xwleqqln";

function viewContact(){
  viewStatic("Contact", "Contact", `
    <h1>Contact</h1>
    <p>Have a question, spotted an error, or want to request a calculator we don't have yet? We'd like to hear from you.</p>
    <div class="panel" style="max-width:480px;">
      <h2 style="margin-bottom:14px;">Send a message</h2>
      <div class="notice" id="contact-notice"></div>
      <div class="field" id="field-c-name"><label for="c-name">Name</label><div class="input-wrap"><input id="c-name" type="text" placeholder="Your name"></div><div class="field-error">Please enter your name.</div></div>
      <div class="field" id="field-c-email"><label for="c-email">Email</label><div class="input-wrap"><input id="c-email" type="email" placeholder="you@example.com"></div><div class="field-error">Please enter a valid email address.</div></div>
      <div class="field" id="field-c-msg"><label for="c-msg">Message</label><div class="input-wrap"><input id="c-msg" type="text" placeholder="How can we help?"></div><div class="field-error">Please enter a message.</div></div>
      <button class="btn btn-primary btn-block" id="contact-send">Send message</button>
    </div>
  `);

  const notice = document.getElementById("contact-notice");
  const btn = document.getElementById("contact-send");

  function showFieldError(id, show){
    const el = document.getElementById("field-"+id);
    el.classList.toggle("invalid", show);
  }
  function showNotice(msg, isError){
    notice.textContent = msg;
    notice.classList.add("show");
    notice.style.background = isError ? "var(--danger-tint)" : "var(--success-tint)";
    notice.style.color = isError ? "var(--danger)" : "var(--success)";
    notice.style.borderColor = isError ? "var(--danger)" : "var(--success)";
  }

  btn.addEventListener("click", async ()=>{
    const name = document.getElementById("c-name").value.trim();
    const email = document.getElementById("c-email").value.trim();
    const message = document.getElementById("c-msg").value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    showFieldError("c-name", !name);
    showFieldError("c-email", !emailValid);
    showFieldError("c-msg", !message);
    if(!name || !emailValid || !message) return;

    notice.classList.remove("show");
    btn.disabled = true;
    btn.textContent = "Sending...";

    try{
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {"Content-Type":"application/json", "Accept":"application/json"},
        body: JSON.stringify({name, email, message})
      });
      if(res.ok){
        showNotice("Thanks — your message has been sent. We'll get back to you soon.", false);
        document.getElementById("c-name").value = "";
        document.getElementById("c-email").value = "";
        document.getElementById("c-msg").value = "";
      } else {
        showNotice("Something went wrong sending your message. Please try again in a moment.", true);
      }
    } catch(err){
      showNotice("Couldn't reach the server — check your connection and try again.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Send message";
    }
  });
}
function viewPrivacy(){
  viewStatic("Privacy Policy", "Privacy Policy", `
    <h1>Privacy Policy</h1>
    <p>Last updated: 2026.</p>
    <h2>How your data is handled</h2>
    <p>All calculator inputs are processed locally in your browser. Figures you type into a calculator are not transmitted to or stored on any server.</p>
    <h2>What we store on your device</h2>
    <p>Favourites, recent calculations and saved calculation history are stored using your browser's local storage. This data stays on your device and is not accessible to us. Clearing your browser data will remove it.</p>
    <h2>What we don't collect</h2>
    <p>We do not require an account, collect personal financial information, or sell data to third parties.</p>
    <h2>Contact</h2>
    <p>Questions about this policy can be sent through the <a href="#/contact">Contact page</a>.</p>
  `);
}
function viewTerms(){
  viewStatic("Terms & Conditions", "Terms & Conditions", `
    <h1>Terms &amp; Conditions</h1>
    <p>Last updated: 2026.</p>
    <h2>Use of this site</h2>
    <p>BusinessTools calculators are provided free of charge for informational and planning purposes.</p>
    <h2>No financial advice</h2>
    <p>Results are calculations based on the numbers you enter and standard formulas — they are not financial, tax, or legal advice. Verify important decisions with a qualified professional.</p>
    <h2>Accuracy</h2>
    <p>We aim for accurate formulas and clear results, but you are responsible for checking that inputs and results fit your situation.</p>
    <h2>Limitation of liability</h2>
    <p>BusinessTools is provided "as is" without warranties of any kind.</p>
    <h2>Changes</h2>
    <p>These terms may be updated from time to time; continued use of the site means you accept the current version.</p>
  `);
}
function view404(){
  viewStatic("Page Not Found", "Not Found", `<h1>Page not found</h1><p>That page doesn't exist. <a href="#/">Go back home</a>.</p>`);
}
/* ============================================================
   Part 5: Router + init
   ============================================================ */

const CATEGORY_SLUGS = ["pricing","finance","business-planning","operations"];

function router(){
  window.scrollTo(0,0);
  const hash = location.hash || "#/";
  const path = hash.replace(/^#/, "").replace(/^\//, ""); // e.g. "" | "tools" | "tools/gst-calculator" | "about"
  const segments = path.split("/").filter(Boolean);

  // Update active nav link styling
  document.querySelectorAll(".nav-main a, .mobile-nav a").forEach(a => a.classList.remove("router-active"));

  if(segments.length === 0){
    viewHome();
    document.title = "BusinessTools — Smart Calculators for Smarter Business Decisions";
    return;
  }

  if(segments[0] === "tools"){
    if(segments.length === 1){
      viewToolsList(null);
      document.title = "All Business Tools — BusinessTools";
      return;
    }
    const second = segments[1];
    if(CATEGORY_SLUGS.includes(second)){
      viewToolsList(second);
      document.title = "All Business Tools — BusinessTools";
      return;
    }
    const def = CALC_DEFS.find(c => c.slug === second);
    if(def){ viewCalculator(def); return; }
    view404();
    return;
  }

  if(segments[0] === "dashboard"){ viewDashboard(); document.title = "Dashboard — BusinessTools"; return; }
  if(segments[0] === "about"){ viewAbout(); return; }
  if(segments[0] === "contact"){ viewContact(); return; }
  if(segments[0] === "privacy-policy"){ viewPrivacy(); return; }
  if(segments[0] === "terms"){ viewTerms(); return; }

  view404();
}

function init(){
  initTheme();
  initMobileNav();
  window.addEventListener("hashchange", router);
  router();
}

document.addEventListener("DOMContentLoaded", init);
