/**
 * Physics Kernel for Zone-Based Conductor Sizing
 * Based on 'Truck overview.md' specifications.
 */

// Constants
export const RHO_COPPER = 0.01724; // Ohm*mm^2/m
export const DEFAULT_VOLTAGE_DROP_PERCENT = 0.03; // 3%
export const AMPACITY_SAFETY_FACTOR = 1.25;

// Standard Wire Sizes (Metric mm^2)
export const METRIC_SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];

// AWG Equivalents (for display/reference)
export const AWG_MAP: Record<number, string> = {
    1.5: "16 AWG",
    2.5: "14 AWG",
    4.0: "12 AWG",
    6.0: "10 AWG",
    10.0: "8 AWG",
    16.0: "6 AWG",
    25.0: "4 AWG",
    35.0: "2 AWG",
    50.0: "1/0 AWG",
    70.0: "2/0 AWG",
    120.0: "4/0 AWG"
};

// Ampacity Table (Approximate conservative ratings for 60/75C wire in conduit/bundle)
// Source: Simplified heuristic for ELV DC.
// Key: mm^2, Value: Max Amps
export const AMPACITY_RATINGS: Record<number, number> = {
    1.5: 20,
    2.5: 30,
    4.0: 40,
    6.0: 55,
    10.0: 75,
    16.0: 100,
    25.0: 130,
    35.0: 170,
    50.0: 230,
    70.0: 285,
    95.0: 350,
    120.0: 400
};

export interface ConductorResult {
    totalWatts: number;
    totalAmps: number;
    requiredAreaVolts: number; // Area required by voltage drop
    requiredAreaAmps: number;  // Area required by ampacity
    selectedArea: number;      // Final selected size (mm^2)
    awgLabel: string;
    voltageDropVal: number;    // Actual volts lost
    voltageDropPercent: number;// Actual % lost
}

/**
 * Calculates the required conductor size for a specific zone load.
 * @param watts Total load in Watts
 * @param voltage System Voltage (V)
 * @param lengthOneWay Length of run (Meters)
 * @param maxDropPercent Allowable drop (0.03 = 3%)
 */
export const calculateConductorSize = (
    watts: number,
    voltage: number,
    lengthOneWay: number,
    maxDropPercent: number = DEFAULT_VOLTAGE_DROP_PERCENT
): ConductorResult => {

    // 1. Current Calculation
    // safety check for divide by zero
    if (voltage <= 0) voltage = 24;
    const I = watts / voltage;

    // 2. Allowable Voltage Loss
    const V_loss_max = voltage * maxDropPercent;

    // 3. Required Area via Voltage Drop Physics
    // A = (2 * L * I * rho) / V_loss
    const A_req_volts = (2 * lengthOneWay * I * RHO_COPPER) / V_loss_max;

    // 4. Ampacity Floor Check
    // Wire must handle I * 1.25 (125%)
    const I_safety = I * AMPACITY_SAFETY_FACTOR;

    // Find smallest standard size that satisfies Ampacity
    let A_req_amps = 1.5;
    for (const size of METRIC_SIZES) {
        if ((AMPACITY_RATINGS[size] || 9999) >= I_safety) {
            A_req_amps = size;
            break;
        }
    }

    // 5. Select Final Size (Max of Voltage or Ampacity requirements)
    const rawReq = Math.max(A_req_volts, A_req_amps);

    // Round up to next standard size
    let finalSize = METRIC_SIZES[METRIC_SIZES.length - 1]; // default to largest if over
    for (const size of METRIC_SIZES) {
        if (size >= rawReq) {
            finalSize = size;
            break;
        }
    }

    // 6. Calculate Actual Drop for Selected Size
    // V_drop = (2 * L * I * rho) / A
    const actualDrop = (2 * lengthOneWay * I * RHO_COPPER) / finalSize;
    const actualDropPercent = actualDrop / voltage;

    return {
        totalWatts: watts,
        totalAmps: I,
        requiredAreaVolts: A_req_volts,
        requiredAreaAmps: A_req_amps,
        selectedArea: finalSize,
        awgLabel: AWG_MAP[finalSize] || `${finalSize}mm²`,
        voltageDropVal: actualDrop,
        voltageDropPercent: actualDropPercent
    };
};
