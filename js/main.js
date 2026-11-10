// ==========================================
// BEAMLAB - MECHANICS ENGINE
// ==========================================

const analyzeButton = document.getElementById("analyzeBtn");
const backButton = document.getElementById("backBtn");

const configurationView = document.getElementById("configurationView");
const resultsView = document.getElementById("resultsView");


analyzeButton.addEventListener("click", () => {

    const success = analyzeBeam();

    if (success) {

        configurationView.hidden = true;
        resultsView.hidden = false;

        setTimeout(() => {
            Plotly.Plots.resize(document.getElementById("sfd"));
            Plotly.Plots.resize(document.getElementById("bmd"));
        }, 50);

        window.scrollTo({ top: 0, behavior: "smooth" });
    }
});


backButton.addEventListener("click", () => {

    resultsView.hidden = true;
    configurationView.hidden = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
});

// ==========================================
// DYNAMIC LOAD CARDS
// ==========================================

const loadsContainer = document.getElementById("loadsContainer");
const addLoadButton = document.getElementById("addLoadBtn");

let loadCounter = 0;

function updateLoadNumbers() {

    const cards = loadsContainer.querySelectorAll(".load-card");

    cards.forEach((card, index) => {
        card.querySelector("h4").textContent = `Load ${index + 1}`;
    });

}

function addLoadCard() {

    loadCounter++;

    const card = document.createElement("div");

    card.className = "load-card";
    card.dataset.loadId = loadCounter;

    card.innerHTML = `
        <div class="load-card-header">

            <h4>Load ${loadCounter}</h4>

            <button type="button" class="remove-load-button">
                REMOVE
            </button>

        </div>

        <label>Load Type</label>

        <select class="load-type-select">

            <option value="point">Point Load</option>
            <option value="udl">Uniformly Distributed Load (UDL)</option>

        </select>

        <div class="point-load-fields">

            <label>Point Load (N)</label>
            <input type="number" class="load-magnitude"
       value="500" step="any">

            <label>Position from Left (m)</label>
            <input type="number" class="load-position"
                   value="1" min="0" step="0.1">

        </div>

        <div class="udl-fields" style="display:none;">

            <label>UDL Magnitude (N/m)</label>
            <input type="number" class="udl-magnitude"
                   value="100" min="0">

            <label>Start Position (m)</label>
            <input type="number" class="udl-start"
                   value="0" min="0" step="0.1">

            <label>End Position (m)</label>
            <input type="number" class="udl-end"
                   value="2" min="0" step="0.1">

        </div>

    `;

    // Switch between point load and UDL fields

    const typeSelect = card.querySelector(".load-type-select");

    typeSelect.addEventListener("change", () => {

        const isPoint = typeSelect.value === "point";

        card.querySelector(".point-load-fields").style.display =
            isPoint ? "block" : "none";

        card.querySelector(".udl-fields").style.display =
            isPoint ? "none" : "block";

    });

    // Remove this load card

    card.querySelector(".remove-load-button")
    .addEventListener("click", () => {

        card.remove();
        updateLoadNumbers();

    });

    loadsContainer.appendChild(card);
updateLoadNumbers();
}


// Add new load when button is clicked

addLoadButton.addEventListener("click", addLoadCard);

// ==========================================
// CROSS-SECTION SELECTOR
// ==========================================

document.getElementById("sectionType").addEventListener("change", updateSectionInputs);

function updateSectionInputs() {

    const type = document.getElementById("sectionType").value;

    document.getElementById("rectangleInputs").style.display =
        type === "rectangle" ? "block" : "none";

    document.getElementById("circleInputs").style.display =
        type === "circle" ? "block" : "none";

    document.getElementById("iSectionInputs").style.display =
        type === "iSection" ? "block" : "none";
}

// ==========================================
// MATERIAL SELECTOR
// ==========================================

document.getElementById("materialType")
    .addEventListener("change", updateMaterialProperties);


function updateMaterialProperties() {

    const material = document.getElementById("materialType").value;

    const youngsInput = document.getElementById("youngs");
    const yieldInput = document.getElementById("yield");

    const materials = {
        steel: {
            E: 200,
            yield: 250
        },

        aluminium: {
            E: 68.9,
            yield: 276
        },

        stainless: {
            E: 193,
            yield: 215
        },

        copper: {
            E: 110,
            yield: 70
        },

        titanium: {
            E: 114,
            yield: 880
        }
    };

    if (material === "custom") {

        youngsInput.readOnly = false;
        yieldInput.readOnly = false;

    }
    else {

        const properties = materials[material];

        youngsInput.value = properties.E;
        yieldInput.value = properties.yield;

        youngsInput.readOnly = true;
        yieldInput.readOnly = true;
    }
}


// ==========================================
// CALCULATE SECTION PROPERTIES
// ==========================================

function getSectionProperties() {

    const type = document.getElementById("sectionType").value;

    let I = 0;
    let c = 0;

    if (type === "rectangle") {

        const b = Number(document.getElementById("width").value);
        const h = Number(document.getElementById("height").value);

        if (![b, h].every(Number.isFinite) || b <= 0 || h <= 0) {
            alert("Enter valid rectangular section dimensions.");
            return null;
        }

        I = b * Math.pow(h, 3) / 12;
        c = h / 2;

    }

    else if (type === "circle") {

        const d = Number(document.getElementById("diameter").value);

        if (!Number.isFinite(d) || d <= 0) {
            alert("Enter a valid circular section diameter.");
            return null;
        }

        I = Math.PI * Math.pow(d, 4) / 64;
        c = d / 2;

    }

    else if (type === "iSection") {

        const h = Number(document.getElementById("iHeight").value);
        const bf = Number(document.getElementById("flangeWidth").value);
        const tf = Number(document.getElementById("flangeThickness").value);
        const tw = Number(document.getElementById("webThickness").value);

        if (
            ![h, bf, tf, tw].every(Number.isFinite) ||
            h <= 0 || bf <= 0 || tf <= 0 || tw <= 0 ||
            2 * tf >= h || tw >= bf
        ) {
            alert("Enter valid I-section dimensions.");
            return null;
        }

        I = (
            bf * Math.pow(h, 3) -
            (bf - tw) * Math.pow(h - 2 * tf, 3)
        ) / 12;

        c = h / 2;
    }

    return { I, c };
}
// MAIN FUNCTION

// ==========================================
// MAIN MULTIPLE-LOAD ANALYSIS ENGINE
// ==========================================

function analyzeBeam() {

    const L = Number(document.getElementById("length").value);
    const beamType = document.getElementById("beamType").value;

    const E = Number(document.getElementById("youngs").value);
    const yieldStrength = Number(document.getElementById("yield").value);

    // ======================================
    // READ ALL LOAD CARDS
    // ======================================

    const loadCards = loadsContainer.querySelectorAll(".load-card");

    if (loadCards.length === 0) {
        alert("Please add at least one load.");
        return false;
    }

    const loads = [];

    for (const card of loadCards) {

        const type = card.querySelector(".load-type-select").value;

        if (type === "point") {

            const magnitude =
                Number(card.querySelector(".load-magnitude").value);

            const position =
                Number(card.querySelector(".load-position").value);

            if (
                !Number.isFinite(magnitude) ||
!Number.isFinite(position) ||
magnitude === 0 ||
position < 0 ||
position > L
            ) {
                alert("Please enter a valid point load and position.");
                return false;
            }

            loads.push({
                type: "point",
                magnitude: magnitude,
                position: position
            });

        }

        else {

            const magnitude =
                Number(card.querySelector(".udl-magnitude").value);

            const start =
                Number(card.querySelector(".udl-start").value);

            const end =
                Number(card.querySelector(".udl-end").value);

            if (
                !Number.isFinite(magnitude) ||
                !Number.isFinite(start) ||
                !Number.isFinite(end) ||
                magnitude <= 0 ||
                start < 0 ||
                start >= end ||
                end > L
            ) {
                alert("Please enter valid UDL magnitude and positions.");
                return false;
            }

            loads.push({
                type: "udl",
                magnitude: magnitude,
                start: start,
                end: end
            });

        }
    }

    // ======================================
    // VALIDATE BEAM AND MATERIAL
    // ======================================

    if (
        !Number.isFinite(L) ||
        !Number.isFinite(E) ||
        !Number.isFinite(yieldStrength) ||
        L <= 0 ||
        E <= 0 ||
        yieldStrength <= 0
    ) {
        alert("Please enter valid beam and material properties.");
        return false;
    }

    const section = getSectionProperties();

    if (!section) return false;

    const I = section.I;
    const c = section.c;

    // ======================================
    // USER-CHOSEN STRESS POINT
    // ======================================

    const pointX = Number(document.getElementById("pointX").value);
    const pointY = Number(document.getElementById("pointY").value);

    if (!Number.isFinite(pointX) || pointX < 0 || pointX > L) {
        alert("Stress point position must be between 0 and the beam length.");
        return false;
    }

    if (!Number.isFinite(pointY) || Math.abs(pointY) > c) {
        alert(
            "Distance from neutral axis must be between -" +
            c.toFixed(2) + " and " + c.toFixed(2) + " mm."
        );
        return false;
    }

    document.getElementById("sectionI").textContent =
        I.toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });

    document.getElementById("sectionC").textContent =
        c.toFixed(2);

    // ======================================
    // CALCULATE EQUIVALENT LOADS
    // ======================================

    let totalLoad = 0;
    let totalLoadMoment = 0;

    for (const load of loads) {

        let force;
        let centroid;

        if (load.type === "point") {

            force = load.magnitude;
            centroid = load.position;

        } else {

            force = load.magnitude * (load.end - load.start);
            centroid = (load.start + load.end) / 2;

        }

        totalLoad += force;
        totalLoadMoment += force * centroid;

    }

    // ======================================
    // SUPPORT REACTIONS
    // ======================================

    let RA = 0;
    let RB = 0;

    if (beamType === "cantilever") {

        // RA = vertical reaction
        // RB = fixed-end moment

        RA = totalLoad;
        RB = totalLoadMoment;

    } else {

        // Simply supported beam

        RB = totalLoadMoment / L;
        RA = totalLoad - RB;

    }

    // ======================================
    // SHEAR FORCE AND BENDING MOMENT
    // ======================================

    const xValues = [];
    const shearValues = [];
    const momentValues = [];

    const n = 400;

    function shearMomentAt(x) {

        let V = 0;
        let M = 0;

        if (beamType === "cantilever") {

            // ==================================
            // CANTILEVER
            // ==================================

            for (const load of loads) {

                if (load.type === "point") {

                    if (x < load.position) {

                        V += load.magnitude;

                        M -= load.magnitude *
                            (load.position - x);

                    }

                } else {

                    const loadedStart = Math.max(x, load.start);

                    if (loadedStart < load.end) {

                        const loadedLength =
                            load.end - loadedStart;

                        const force =
                            load.magnitude * loadedLength;

                        const centroid =
                            (loadedStart + load.end) / 2;

                        V += force;

                        M -= force * (centroid - x);

                    }

                }

            }

        } else {

            // ==================================
            // SIMPLY SUPPORTED
            // ==================================

            V = -RA;

            M = RA * x;

            for (const load of loads) {

                if (load.type === "point") {

                    if (x >= load.position) {

                        V += load.magnitude;

                        M -= load.magnitude *
                            (x - load.position);

                    }

                } else {

                    const loadedEnd =
                        Math.min(x, load.end);

                    const loadedLength =
                        Math.max(0, loadedEnd - load.start);

                    if (loadedLength > 0) {

                        const force =
                            load.magnitude * loadedLength;

                        const centroid =
                            (load.start + loadedEnd) / 2;

                        V += force;

                        M -= force * (x - centroid);

                    }

                }

            }

        }

        return { V, M };

    }

    for (let i = 0; i <= n; i++) {

        const x = L * i / n;
        const { V, M } = shearMomentAt(x);

        xValues.push(x);
        shearValues.push(V);
        momentValues.push(M);

    }

    // ======================================
    // MAXIMUM SHEAR AND MOMENT
    // ======================================

    const maxShear = Math.max(
        ...shearValues.map(value => Math.abs(value))
    );

    const maxMoment = Math.max(
        ...momentValues.map(value => Math.abs(value))
    );

    // ======================================
    // BENDING STRESS AND FACTOR OF SAFETY
    // ======================================

    const maxStress = (maxMoment * 1000 * c) / I;

    const factorOfSafety = maxStress > 0
        ? yieldStrength / maxStress
        : Infinity;

    // Stress at the user-chosen point
    // y is positive above the neutral axis. M is positive when sagging,
    // so sagging puts the top in compression: sigma = -M*y/I
    // (+ve = tension, -ve = compression)

    const pointMoment = shearMomentAt(pointX).M;

    let pointStress = 0 - (pointMoment * 1000 * pointY) / I;

    if (Math.abs(pointStress) < 1e-9) pointStress = 0;

    // ======================================
    // DISPLAY RESULTS
    // ======================================

    document.getElementById("reactionA").textContent =
        RA.toFixed(2);

    document.getElementById("reactionB").textContent =
        RB.toFixed(2);

    document.querySelector("#reactionB + small").textContent =
        beamType === "cantilever"
            ? "N·m (fixed moment)"
            : "N";

    document.getElementById("maxShear").textContent =
        maxShear.toFixed(2);

    document.getElementById("maxMoment").textContent =
        maxMoment.toFixed(2);

    document.getElementById("maxStress").textContent =
        maxStress.toFixed(2);

    document.getElementById("pointMoment").textContent =
        pointMoment.toFixed(2);

    document.getElementById("pointMomentNote").textContent =
        "N·m at x = " + pointX + " m";

    document.getElementById("pointStress").textContent =
        pointStress.toFixed(2);

    document.getElementById("pointStressNote").textContent =
        "MPa (" +
        (pointStress > 0 ? "tension" : pointStress < 0 ? "compression" : "zero stress") +
        ") at y = " + pointY + " mm";

    document.getElementById("factorSafety").textContent =
        Number.isFinite(factorOfSafety)
            ? factorOfSafety.toFixed(2)
            : "∞";

    // ======================================
    // STRUCTURAL SAFETY STATUS
    // ======================================

    const safetyStatus =
        document.getElementById("safetyStatus");

    const safetyCard =
        document.getElementById("safetyCard");

    if (factorOfSafety < 1) {

        safetyStatus.textContent = "UNSAFE";
        safetyCard.style.borderColor = "#ef4444";

    }
    else if (factorOfSafety < 1.5) {

        safetyStatus.textContent = "CRITICAL";
        safetyCard.style.borderColor = "#f97316";

    }
    else if (factorOfSafety < 2) {

        safetyStatus.textContent = "CAUTION";
        safetyCard.style.borderColor = "#eab308";

    }
    else {

        safetyStatus.textContent = "SAFE";
        safetyCard.style.borderColor = "#22c55e";

    }

    // ======================================
    // DEFLECTION AND STRAIN
    // ======================================

    const E_Pa = E * 1e9;
    const I_m4 = I * 1e-12;

    const EI = E_Pa * I_m4;

    const c_m = c / 1000;

    const deflectionValues = [];
    const strainValues = [];

    let maxDeflection = 0;
    let maxDeflectionX = 0;

    for (let i = 0; i <= n; i++) {

        const x = xValues[i];

        // Superposition of individual load deflections

        let totalDeflection = 0;

        for (const load of loads) {

            if (load.type === "point") {

                totalDeflection += calculateDeflection(
                    x, L,
                    load.magnitude,
                    load.position,
                    0, 0, 0,
                    EI, beamType, "point"
                );

            } else {

                totalDeflection += calculateDeflection(
                    x, L,
                    0, 0,
                    load.magnitude,
                    load.start,
                    load.end,
                    EI, beamType, "udl"
                );

            }

        }

        deflectionValues.push({
            x: x,
            v: totalDeflection
        });

        if (
            Math.abs(totalDeflection) >
            Math.abs(maxDeflection)
        ) {

            maxDeflection = totalDeflection;
            maxDeflectionX = x;

        }

        // Extreme-fibre bending strain

        strainValues.push(
            Math.abs(momentValues[i]) * c_m / EI
        );

    }

    const maxStrain = Math.max(...strainValues);

    // ======================================
    // DRAW SHEAR FORCE DIAGRAM
    // ======================================

    Plotly.newPlot("sfd", [

        {
            x: xValues,
            y: shearValues,
            type: "scatter",
            mode: "lines",
            line: {
                color: "#38bdf8",
                width: 3
            },
            fill: "tozeroy",
            fillcolor: "rgba(56,189,248,0.15)"
        }

    ], {

        title: "Shear Force (N)",

        xaxis: {
            title: "Distance along beam (m)"
        },

        yaxis: {
            title: "Shear Force (N)"
        },

        paper_bgcolor: "#172337",
        plot_bgcolor: "#101827",

        font: {
            color: "#e5e7eb"
        },

        margin: {
            t: 50,
            b: 55,
            l: 65,
            r: 25
        }

    }, { responsive: true });

    // ======================================
    // DRAW BENDING MOMENT DIAGRAM
    // ======================================

    Plotly.newPlot("bmd", [

        {
            x: xValues,
            y: momentValues,
            type: "scatter",
            mode: "lines",
            line: {
                color: "#f59e0b",
                width: 3
            },
            fill: "tozeroy",
            fillcolor: "rgba(245,158,11,0.15)"
        },

        {
            x: [pointX],
            y: [pointMoment],
            type: "scatter",
            mode: "markers",
            marker: {
                color: "#38bdf8",
                size: 11,
                line: { color: "#ffffff", width: 1.5 }
            },
            hovertemplate:
                "Chosen point<br>x = %{x} m<br>M = %{y:.2f} N·m<extra></extra>"
        }

    ], {

        showlegend: false,

        title: "Bending Moment (N·m)",

        xaxis: {
            title: "Distance along beam (m)"
        },

        yaxis: {
            title: "Bending Moment (N·m)"
        },

        paper_bgcolor: "#172337",
        plot_bgcolor: "#101827",

        font: {
            color: "#e5e7eb"
        },

        margin: {
            t: 50,
            b: 55,
            l: 65,
            r: 25
        }

    }, { responsive: true });

    // ======================================
    // DRAW BEAM
    // ======================================

    drawBeam(
        L,
        beamType,
        loads,
        deflectionValues,
        maxDeflection,
        maxDeflectionX,
        strainValues,
        maxStrain
    );

    return true;

}


// ==========================================
// DEFLECTION FORMULAS
// ==========================================

function calculateDeflection(
    x, L, P, a, w, udlStart, udlEnd,
    EI, beamType, loadType
) {

    // Cantilever beam

    if (beamType === "cantilever") {

        if (loadType === "point") {

            if (x <= a) {

                return -P * x * x * (3 * a - x) / (6 * EI);

            } else {

                return -P * a * a * (3 * x - a) / (6 * EI);

            }
        }

        // Partial UDL

        return integrateUDLDeflection(
            x, L, w, udlStart, udlEnd, EI, "cantilever"
        );
    }

    // Simply supported beam

    else {

        if (loadType === "point") {

            const b = L - a;

            if (x <= a) {

                return -P * b * x *
                    (L * L - b * b - x * x) / (6 * L * EI);

            } else {

                return -P * a * (L - x) *
                    (L * L - a * a - (L - x) * (L - x))
                    / (6 * L * EI);

            }
        }

        // Partial UDL

        return integrateUDLDeflection(
            x, L, w, udlStart, udlEnd, EI, "simply"
        );
    }
}


// ==========================================
// NUMERICAL INTEGRATION FOR PARTIAL UDL
// ==========================================

function integrateUDLDeflection(
    x, L, w, start, end, EI, beamType
) {

    // Simpson's rule

    const intervals = 100;
    const h = (end - start) / intervals;

    function pointLoadKernel(t) {

        // Deflection at x due to unit point load at t

        if (beamType === "cantilever") {

            if (x <= t) {

                return -x * x * (3 * t - x) / (6 * EI);

            } else {

                return -t * t * (3 * x - t) / (6 * EI);

            }
        }

        // Simply supported beam

        const b = L - t;

        if (x <= t) {

            return -b * x *
                (L * L - b * b - x * x) / (6 * L * EI);

        } else {

            return -t * (L - x) *
                (L * L - t * t - (L - x) * (L - x))
                / (6 * L * EI);

        }
    }

    let sum = pointLoadKernel(start) + pointLoadKernel(end);

    for (let i = 1; i < intervals; i++) {

        const t = start + i * h;

        sum += (i % 2 === 0 ? 2 : 4) * pointLoadKernel(t);
    }

    return w * h * sum / 3;
}


// ==========================================
// BEAM SVG VISUALIZATION WITH DEFLECTION
// ==========================================

function drawBeam(
    L, beamType, loads,
    deflectionValues, maxDeflection, maxDeflectionX,
    strainValues, maxStrain
) {
    const left = 70;
    const right = 630;
    const y = 100;

    const beamLength = right - left;

    

    // Scale deflection curve for visibility

    const maxPixels = 35;

    const scale = Math.abs(maxDeflection) > 0
        ? maxPixels / Math.abs(maxDeflection)
        : 0;

    // ======================================
// STRAIN-BASED BEAM COLOURING
// ======================================

let deflectionSegments = "";

for (let i = 0; i < deflectionValues.length - 1; i++) {

    const p1 = deflectionValues[i];
    const p2 = deflectionValues[i + 1];

    const x1 = left + (p1.x / L) * beamLength;
    const x2 = left + (p2.x / L) * beamLength;

    const y1 = y - p1.v * scale;
    const y2 = y - p2.v * scale;

    const avgStrain =
        (strainValues[i] + strainValues[i + 1]) / 2;

    const ratio = maxStrain > 0
        ? avgStrain / maxStrain
        : 0;

    // Blue -> Green -> Yellow -> Red

    const hue = 240 * (1 - ratio);

    const colour = `hsl(${hue}, 100%, 50%)`;

    deflectionSegments += `
        <line
            x1="${x1}" y1="${y1}"
            x2="${x2}" y2="${y2}"
            stroke="${colour}"
            stroke-width="7"
            stroke-linecap="round"
        />
    `;
}

    let supports = "";

    if (beamType === "cantilever") {

        supports = `
            <rect x="${left - 12}" y="65"
                  width="12" height="70"
                  fill="#64748b"/>

            <path d="M ${left - 12} 65 L ${left - 25} 78
                     M ${left - 12} 85 L ${left - 25} 98
                     M ${left - 12} 105 L ${left - 25} 118"
                  stroke="#94a3b8" stroke-width="2"/>
        `;

    } else {

        supports = `
            <path d="M ${left} 105 L ${left - 15} 125
                     L ${left + 15} 125 Z"
                  fill="#64748b"/>

            <path d="M ${right} 105 L ${right - 15} 125
                     L ${right + 15} 125 Z"
                  fill="#64748b"/>
        `;
    }

// ======================================
// DRAW ALL APPLIED LOADS
// ======================================

let load = "";

// Combine point loads acting at the same position
const displayLoads = [];

loads.forEach(item => {

    if (item.type === "point") {

        const existing = displayLoads.find(load =>
            load.type === "point" &&
            Math.abs(load.position - item.position) < 1e-9
        );

        if (existing) {
            existing.magnitude += item.magnitude;
        } else {
            displayLoads.push({ ...item });
        }

    } else {
        displayLoads.push({ ...item });
    }

});

displayLoads.forEach((item, index) => {

    // Give every load its own vertical lane
    const topY = 22 + index * 22;

    if (item.type === "point") {

        const loadX =
            left + (item.position / L) * beamLength;

        // Keep labels inside the SVG boundaries
        const labelAnchor = loadX > 550 ? "end" : "start";
        const labelX = loadX > 550 ? loadX - 10 : loadX + 10;

        // Determine arrow direction from force sign

const isUpward = item.magnitude < 0;

const arrowStartY = isUpward ? 145 : topY + 5;
const arrowEndY = isUpward ? 112 : 88;

const arrowHead = isUpward
    ? `
        M ${loadX - 7} 125
        L ${loadX} 112
        L ${loadX + 7} 125
      `
    : `
        M ${loadX - 7} 75
        L ${loadX} 88
        L ${loadX + 7} 75
      `;

load += `
    <!-- Point load arrow -->

    <line
        x1="${loadX}" y1="${arrowStartY}"
        x2="${loadX}" y2="${arrowEndY}"
        stroke="#ef4444"
        stroke-width="2.5"
    />

    <path
        d="${arrowHead}"
        fill="none"
        stroke="#ef4444"
        stroke-width="2.5"
    />

    <!-- Load label -->

            <text
                x="${labelX}"
                y="${topY}"
                text-anchor="${labelAnchor}"
                fill="#ef4444"
                font-size="12"
                font-weight="bold"
            >${item.magnitude} N</text>
        `;

    } else {

        const udlLeft =
            left + (item.start / L) * beamLength;

        const udlRight =
            left + (item.end / L) * beamLength;

        load += `
            <!-- UDL horizontal line -->

            <line
                x1="${udlLeft}" y1="${topY + 5}"
                x2="${udlRight}" y2="${topY + 5}"
                stroke="#ef4444"
                stroke-width="2"
            />

            <!-- UDL label -->

            <text
                x="${(udlLeft + udlRight) / 2}"
                y="${topY - 5}"
                text-anchor="middle"
                fill="#ef4444"
                font-size="12"
                font-weight="bold"
            >${item.magnitude} N/m</text>
        `;

        // Adaptive arrow spacing based on UDL length
        const arrowCount = Math.max(
            2,
            Math.floor((udlRight - udlLeft) / 35)
        );

        for (let i = 0; i <= arrowCount; i++) {

            const arrowX =
                udlLeft +
                i * (udlRight - udlLeft) / arrowCount;

            load += `
                <line
                    x1="${arrowX}" y1="${topY + 7}"
                    x2="${arrowX}" y2="85"
                    stroke="#ef4444"
                    stroke-width="1.5"
                />

                <path
                    d="M ${arrowX - 5} 77
                       L ${arrowX} 87
                       L ${arrowX + 5} 77"
                    fill="none"
                    stroke="#ef4444"
                    stroke-width="1.5"
                />
            `;
        }

    }

});

    // Maximum deflection marker

    const maxX = left + (maxDeflectionX / L) * beamLength;

    const maxY = y - maxDeflection * scale;

    document.getElementById("beamDrawing").innerHTML = `

        <svg viewBox="0 0 700 250"
             width="100%"
             xmlns="http://www.w3.org/2000/svg">

            ${load}

            <!-- Original undeformed beam -->

            <line x1="${left}" y1="${y}"
                  x2="${right}" y2="${y}"
                  stroke="#64748b"
                  stroke-width="3"
                  stroke-dasharray="8 5"/>

            <!-- Strain Coloured Deflected Beam -->

${deflectionSegments}

            <!-- Maximum deflection marker -->

            <circle cx="${maxX}" cy="${maxY}"
                    r="5"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    stroke-width="1.5"/>

            ${supports}

            <text x="${left}" y="155"
                  fill="#94a3b8"
                  font-size="13">0 m</text>

            <text x="${right - 15}" y="155"
                  fill="#94a3b8"
                  font-size="13">${L} m</text>

            <text x="350" y="155"
                  text-anchor="middle"
                  fill="#e5e7eb"
                  font-size="13">Beam length</text>

            <text x="350" y="185"
                  text-anchor="middle"
                  fill="#f59e0b"
                  font-size="14">
                Max deflection: ${Math.abs(maxDeflection).toExponential(4)} m
                at x = ${maxDeflectionX.toFixed(3)} m
            </text>

            <!-- STRAIN COLOUR LEGEND -->

<defs>
    <linearGradient id="strainGradient">
        <stop offset="0%" stop-color="blue"/>
        <stop offset="25%" stop-color="cyan"/>
        <stop offset="50%" stop-color="lime"/>
        <stop offset="75%" stop-color="yellow"/>
        <stop offset="100%" stop-color="red"/>
    </linearGradient>
</defs>

<text x="350" y="205"
      text-anchor="middle"
      fill="#e5e7eb"
      font-size="12">
    Maximum strain: ${maxStrain.toExponential(3)}
</text>

<rect x="230" y="215"
      width="240" height="10"
      fill="url(#strainGradient)"
      rx="5"/>

<text x="230" y="240"
      fill="#94a3b8"
      font-size="11">
    Low strain
</text>

<text x="470" y="240"
      text-anchor="end"
      fill="#94a3b8"
      font-size="11">
    High strain
</text>

        </svg>

    `;
}


// ==========================================
// INITIALIZATION
// ==========================================

updateSectionInputs();
updateMaterialProperties();

// Start with one load card
addLoadCard();
