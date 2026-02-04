**Truck project overview (for LLM):** This project is a 24V standalone, non-connectable extra-low-voltage (ELV) DC electrical system for a truck/camper build, with the primary objective of optimising a fixed set of generation, storage, conversion, and distribution assets for efficiency vs shading vs safety.  It uses a roof PV array feeding an MPPT, charging a 24V LiFePO4 battery bank(s) feeding a 24V busbar, with downstream inverters and DC-DC converters supporting mixed DC and AC loads (including a dedicated 12V rail).

# Feature Specification: Zone-Based Conductor Sizing Module

## 1.0 Module Scope & Objectives
**Goal:** Implement a physics-based calculation engine that determines the minimum safe conductor cross-section (gauge) for a specific electrical "Zone."
**Definition:** A "Zone" is a dynamic aggregation of electrical loads defined by a shared tag within the existing dataset.

### 1.1 Core Objectives
1.  **Aggregate Load:** Calculate the total power demand (Watts) for a user-selected Zone.
2.  **Derive Current:** Convert total power to Amperes based on system voltage.
3.  **Calculate Gauge:** Determine the required wire size based on **Voltage Drop** constraints over a user-defined distance.
4.  **Standardize:** Map raw calculated values to standard commercial wire sizes (Metric & AWG).

---

## 2.0 The Physics Kernel (Formulas)

Implement the following mathematical logic to derive the wire size.

### 2.1 Variable Definitions
*   $V_{sys}$: System Voltage (e.g., 12, 24, 48 Volts).
*   $P_{total}$: Sum of Watts for all items in the selected Zone.
*   $L$: One-way length of the cable run in meters (User Input).
*   $\%_{drop}$: Maximum allowable voltage drop (Default: **3%** or 0.03).
*   $\rho$ (Rho): Electrical resistivity of Copper. Constant = **0.01724** $\Omega \cdot mm^2/m$.

### 2.2 Step 1: Current Calculation ($I_{load}$)
$$I_{load} = \frac{P_{total}}{V_{sys}}$$

### 2.3 Step 2: Allowable Voltage Loss ($V_{loss}$)
$$V_{loss} = V_{sys} \times \%_{drop}$$

### 2.4 Step 3: Required Cross-Section Area ($A_{req}$)
Calculate the minimum area required to maintain voltage stability. Note the factor of **2** represents the round-trip circuit (positive + negative wire).

$$A_{req} = \frac{2 \times L \times I_{load} \times \rho}{V_{loss}}$$

*Result ($A_{req}$) is in square millimeters ($mm^2$).*

---

## 3.0 Logic Flow & Safety Heuristics

### 3.1 Ampacity Floor Check (Thermal Safety)
While Voltage Drop ($A_{req}$) usually dictates size in low-voltage DC, thermal limits (Ampacity) must be the "floor."
*   **Rule:** The selected wire must handle $I_{load}$ without overheating.
*   **Heuristic:** If $A_{req}$ results in a wire size with an ampacity rating lower than $I_{load} \times 1.25$ (safety factor), override $A_{req}$ with the thermal minimum.

### 3.2 Rounding Logic (The "Next Size Up")
The calculated $A_{req}$ will be a raw float (e.g., `5.32 mm²`). You must compare this against a lookup table and select the **next largest** standard size.

**Example:**
*   Calculated: `5.32 mm²`
*   Standard Sizes: `4 mm²`, `6 mm²`
*   **Selection:** `6 mm²`

---

## 4.0 Reference Data (Lookup Tables)

Use these standard values for the rounding logic.

**Metric ($mm^2$) Standards:**
`[1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120]`

**Imperial (AWG) Equivalents:**
*   16 AWG $\approx$ 1.5 $mm^2$
*   14 AWG $\approx$ 2.5 $mm^2$
*   12 AWG $\approx$ 4.0 $mm^2$
*   10 AWG $\approx$ 6.0 $mm^2$
*   8 AWG $\approx$ 10.0 $mm^2$
*   6 AWG $\approx$ 16.0 $mm^2$
*   4 AWG $\approx$ 25.0 $mm^2$
*   2 AWG $\approx$ 35.0 $mm^2$
*   1/0 AWG $\approx$ 50.0 $mm^2$
*   2/0 AWG $\approx$ 70.0 $mm^2$
*   4/0 AWG $\approx$ 120.0 $mm^2$