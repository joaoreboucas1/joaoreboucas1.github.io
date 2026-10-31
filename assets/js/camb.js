// CAMB in the browser: sends parameters to a Web Worker running CAMB compiled to WebAssembly and plots the results.
const worker = new Worker("../assets/js/camb_worker.js", { type: "module" });
const button = document.getElementById("updateButton");
const statusLine = document.getElementById("status");
const cosmologyList = document.getElementById("cosmologyList");
const inputs = Array.from(document.querySelectorAll(".paramInput"));
const val = (id) => parseFloat(document.getElementById(id).value);
const paramLabels = {
    H0: "H<sub>0</sub>", As: "10<sup>9</sup>A<sub>s</sub>", ombh2: "Ω<sub>b</sub>h²", ns: "n<sub>s</sub>",
    omch2: "Ω<sub>c</sub>h²", tau: "τ", mnu: "Σm<sub>ν</sub>", YHe: "Y<sub>He</sub>",
};

let cosmologies = []; // {id, name, color, summary, result}, in the order they were added
let added = 0; // Total ever added, so ids stay unique after deleting
let pendingSummary = ""; // Description of the cosmology being computed by the worker

const style = getComputedStyle(document.documentElement);
const color1 = style.getPropertyValue("--color_1").trim();
const color2 = style.getPropertyValue("--color_2").trim();
const colorText = style.getPropertyValue("--color_text").trim();
const colorFooter = style.getPropertyValue("--color_footer").trim();
const colors = [color1, color2, colorFooter, "#ae2284"];

const config = { responsive: true, displaylogo: false };
const axis = { showline: true, mirror: true, ticks: "outside", linecolor: colorText, gridcolor: "rgba(0,0,0,0.08)" };
const baseLayout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.25)",
    font: { family: "Georgia, serif", color: colorText },
    showlegend: true,
};

function setStatus(text, isError = false) {
    statusLine.textContent = text;
    statusLine.classList.toggle("error", isError);
}

function compute() {
    const invalid = inputs.find((input) => !input.checkValidity());
    if (invalid) {
        invalid.reportValidity();
        return;
    }
    button.disabled = true;
    button.textContent = "Computing…";
    setStatus("");
    const params = [val("H0"), val("ombh2"), val("omch2"), val("mnu"), val("As") * 1e-9, val("ns"), val("tau"),
        val("YHe")];
    const nonlinear = document.getElementById("nonlinear").checked;
    pendingSummary = inputs.map((input) => `${paramLabels[input.id]} = ${input.value}`)
        .concat(nonlinear ? "HMcode" : "linear P(k)").join(", ");
    worker.postMessage({ params, nonlinear });
}

function renderList() {
    cosmologyList.replaceChildren(...cosmologies.map((c) => {
        const item = document.createElement("li");
        item.innerHTML = `<input type="color" value="${c.color}" aria-label="Cosmology color">
            <input class="cosmologyName" type="text" maxlength="40" aria-label="Cosmology name">
            <span class="cosmologyParams">${c.summary}</span>
            <button class="deleteButton" aria-label="Delete cosmology">&times;</button>`;
        item.querySelector("input[type=color]").addEventListener("change", (event) => {
            c.color = event.target.value;
            plot();
        });
        // The name is typed by the user, so it goes in as a value and never into the HTML above
        const nameInput = item.querySelector(".cosmologyName");
        nameInput.value = c.name;
        nameInput.addEventListener("change", () => {
            c.name = nameInput.value.trim() || c.name;
            nameInput.value = c.name;
            plot();
        });
        item.querySelector("button").addEventListener("click", () => {
            cosmologies = cosmologies.filter((other) => other !== c);
            renderList();
            plot();
        });
        return item;
    }));
}

function plot() {
    const spectra = ["TT", "EE", "BB", "TE"];
    const traces = cosmologies.flatMap((c) => spectra.map((s, i) => ({
        x: c.result.ells, y: c.result.cls[s], name: c.name, legendgroup: c.id, showlegend: i === 0,
        xaxis: `x${i + 1}`, yaxis: `y${i + 1}`, line: { width: 1.5, color: c.color },
    })));
    Plotly.react("plotCls", traces, {
        ...baseLayout,
        title: { text: "Lensed CMB power spectra, ℓ(ℓ+1)C<sub>ℓ</sub>/2π [μK²]" },
        grid: { rows: 2, columns: 2, pattern: "independent" },
        xaxis: axis, xaxis2: axis,
        xaxis3: { ...axis, title: { text: "ℓ" } }, xaxis4: { ...axis, title: { text: "ℓ" } },
        yaxis: axis, yaxis2: axis, yaxis3: { ...axis, type: "log", exponentformat: "power" }, yaxis4: axis,
        // Annotation refs must be "x domain", not "x1 domain"; without traces the axes they refer to don't exist
        annotations: (cosmologies.length ? spectra : []).map((s, i) => ({
            // BB rises to the top of its panel, so its label goes at the bottom
            text: s, showarrow: false, x: 0.98, y: s === "BB" ? 0.08 : 0.92, xanchor: "right",
            xref: `x${i ? i + 1 : ""} domain`, yref: `y${i ? i + 1 : ""} domain`,
        })),
        margin: { t: 60, r: 10, b: 50, l: 60 },
    }, config);

    const pkTraces = cosmologies.map((c) => ({
        x: c.result.kh, y: c.result.pk, name: c.name, line: { width: 2, color: c.color },
    }));
    Plotly.react("plotPk", pkTraces, {
        ...baseLayout,
        title: { text: "Matter power spectrum at z = 0" },
        xaxis: { ...axis, type: "log", title: { text: "k [h/Mpc]" }, exponentformat: "power" },
        yaxis: { ...axis, type: "log", title: { text: "P(k) [(Mpc/h)³]" }, exponentformat: "power" },
        margin: { t: 60, r: 10, b: 50, l: 70 },
    }, config);

    const quantities = [
        { plotId: "plotDA", key: "DA", title: "Angular diameter distance", yTitle: "D<sub>A</sub>(z) [Mpc]" },
        { plotId: "plotDL", key: "DL", title: "Luminosity distance", yTitle: "D<sub>L</sub>(z) [Mpc]" },
        { plotId: "plotChi", key: "chi", title: "Comoving distance", yTitle: "χ(z) [Mpc]" },
        { plotId: "plotH", key: "H", title: "Expansion rate", yTitle: "H(z) [km/s/Mpc]" },
    ];
    quantities.forEach((q) => {
        const traces = cosmologies.map((c) => ({
            x: c.result.zs, y: c.result.dists[q.key], name: c.name, line: { width: 2, color: c.color },
        }));
        Plotly.react(q.plotId, traces, {
            ...baseLayout,
            title: { text: q.title },
            xaxis: { ...axis, title: { text: "z" } },
            yaxis: { ...axis, title: { text: q.yTitle } },
            margin: { t: 60, r: 10, b: 50, l: 70 },
        }, config);
    });
}

worker.onmessage = ({ data }) => {
    button.disabled = false;
    button.textContent = "Add cosmology";
    if (data.error) {
        setStatus(data.error, true);
        return;
    }
    setStatus(`Computed in ${data.seconds.toFixed(2)} s`);
    added += 1;
    cosmologies.push({
        id: `cosmology${added}`,
        name: `Cosmology ${added}`,
        // First palette color not in use, cycling once they are all taken
        color: colors.find((color) => !cosmologies.some((c) => c.color === color)) ?? colors[added % colors.length],
        summary: pendingSummary,
        result: data,
    });
    renderList();
    plot();
};

worker.onerror = () => setStatus("Could not start CAMB in this browser.", true);

button.addEventListener("click", compute);
compute();
