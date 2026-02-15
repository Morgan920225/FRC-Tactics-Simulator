// ============================================================
// FRC 2026 "REBUILT" Tactic Simulator — Core Engine
// ============================================================

// --- ROBOT TIER PROFILES ---
const ROBOT_TIERS = {
    low: {
        name: 'Low-End',
        drivetrain: { effectiveSpeed: 9.6, accelTime: 1.2, bumpPenalty: 1.5, fieldTraverse: 4.0 },
        fuel: { intakeRate: 2, hopperCapacity: 12, shootRate: 2, accuracy: 0.60, shootOnMove: false },
        climber: { maxLevel: 1, l1Time: 5, l3Time: Infinity, reliability: 0.70 },
        defense: { disruption: 0.125, selfPenalty: 0.60 },
        brownout: { risk: 0.15, recoveryTime: 5 },
        reliability: { full: 0.70, partial: 0.20, dead: 0.10, partialReduction: 0.50 }
    },
    mid: {
        name: 'Mid-Tier',
        drivetrain: { effectiveSpeed: 11.4, accelTime: 0.8, bumpPenalty: 0.8, fieldTraverse: 2.8 },
        fuel: { intakeRate: 4, hopperCapacity: 28, shootRate: 4, accuracy: 0.80, shootOnMove: false },
        climber: { maxLevel: 2, l1Time: 3, l3Time: 12, reliability: 0.90 },
        defense: { disruption: 0.25, selfPenalty: 0.40 },
        brownout: { risk: 0.05, recoveryTime: 3 },
        reliability: { full: 0.88, partial: 0.10, dead: 0.02, partialReduction: 0.30 }
    },
    elite: {
        name: 'Elite',
        drivetrain: { effectiveSpeed: 13.2, accelTime: 1.0, bumpPenalty: 1.0, fieldTraverse: 2.5 },
        fuel: { intakeRate: 6, hopperCapacity: 60, shootRate: 10, accuracy: 0.92, shootOnMove: true },
        climber: { maxLevel: 3, l1Time: 2, l3Time: 5, reliability: 0.98 },
        defense: { disruption: 0.40, selfPenalty: 0.20 },
        brownout: { risk: 0.01, recoveryTime: 2 },
        reliability: { full: 0.96, partial: 0.035, dead: 0.005, partialReduction: 0.20 }
    }
};

// --- AUTONOMOUS TIER PROFILES ---
// Granular: each step represents a realistic FRC capability level.
// preloadScored = how many of the 8 preloaded fuel a robot tries to shoot in auto
// Actual scored = preloadScored × robot tier accuracy (rolled with variance)
const AUTO_TIERS = {
    none: { name: 'No Auto (stays still)', leaveZone: false, preloadScored: 0, extraPickup: 0, l1Climb: false, reliability: 1.0, frcPercent: 10 },
    leaveOnly: { name: 'Leave Zone Only (+3pts)', leaveZone: true, preloadScored: 0, extraPickup: 0, l1Climb: false, reliability: 0.90, frcPercent: 15 },
    shoot1: { name: 'Shoot 1 Preloaded', leaveZone: true, preloadScored: 1, extraPickup: 0, l1Climb: false, reliability: 0.85, frcPercent: 15 },
    shoot3: { name: 'Shoot 3 Preloaded', leaveZone: true, preloadScored: 3, extraPickup: 0, l1Climb: false, reliability: 0.80, frcPercent: 15 },
    shoot5: { name: 'Shoot 5 Preloaded', leaveZone: true, preloadScored: 5, extraPickup: 0, l1Climb: false, reliability: 0.75, frcPercent: 12 },
    shoot8: { name: 'Full Preload (8)', leaveZone: true, preloadScored: 8, extraPickup: 0, l1Climb: false, reliability: 0.72, frcPercent: 10 },
    preloadPlus: { name: '8 + Pickup 5 more', leaveZone: true, preloadScored: 8, extraPickup: 5, l1Climb: false, reliability: 0.68, frcPercent: 10 },
    multiCycle: { name: '8 + Pickup 15 (multi-cycle)', leaveZone: true, preloadScored: 8, extraPickup: 15, l1Climb: false, reliability: 0.60, frcPercent: 8 },
    elite: { name: '8 + 15 + Auto L1 Climb', leaveZone: true, preloadScored: 8, extraPickup: 15, l1Climb: true, reliability: 0.55, frcPercent: 5 }
};

// --- HUMAN PLAYER TIERS ---
const HP_TIERS = {
    low: { name: 'Low Skill', throwRate: 0.5, accuracy: 0.40 },
    average: { name: 'Average', throwRate: 1.0, accuracy: 0.60 },
    elite: { name: 'Elite', throwRate: 2.0, accuracy: 0.75 }
};

// --- TACTIC ARCHETYPES (alliance-level) ---
// Each tactic describes what ALL 3 robots do together as an alliance.
// roles[0..2] define each robot's job: 'scorer', 'defender', 'feeder', 'climber'
const TACTICS = {
    tripleOffense: {
        name: 'Triple Offense',
        icon: '\u26A1',
        description: 'All 3 robots focus on scoring fuel into the hub as fast as possible. No defense played.',
        guide: 'Best when: Your robots have strong shooters and fast cycle times. Risk: Opponents score freely too.',
        roles: ['scorer', 'scorer', 'scorer'],
        roleLabels: ['Scorer #1', 'Scorer #2', 'Scorer #3'],
        defaultTier: 'mid',
        defaultAutos: ['shoot8', 'shoot5', 'shoot3'],
        defaultHP: 'average',
        inactiveBehavior: 'hoard',
        defenseRole: 'none',
        defenseTarget: 'none'
    },
    twoOneDef: {
        name: '2 Offense + 1 Defense',
        icon: '\u{1F6E1}\uFE0F',
        description: '2 robots score fuel while 1 robot plays full-time defense, disrupting the opponent\'s best scorer.',
        guide: 'Best when: You have 2 strong scorers and 1 fast but inaccurate robot. The defender slows opponents by ~25-40%.',
        roles: ['scorer', 'scorer', 'defender'],
        roleLabels: ['Scorer #1', 'Scorer #2', 'Defender'],
        defaultTier: 'mid',
        defaultAutos: ['shoot5', 'shoot3', 'leaveOnly'],
        defaultHP: 'average',
        inactiveBehavior: 'defend',
        defenseRole: 'oneDefender',
        defenseTarget: 'bestScorer'
    },
    cycleSpecialist: {
        name: 'Cycle Specialist',
        icon: '\u{1F504}',
        description: 'All 3 robots run ultra-fast collect\u2192shoot loops. One robot focuses on collecting and delivering fuel near the hub for maximum throughput.',
        guide: 'Best when: All robots are elite-tier with fast intakes and accurate shooters. Requires high robot reliability.',
        roles: ['scorer', 'scorer', 'scorer'],
        roleLabels: ['Primary Scorer', 'Secondary Scorer', 'Collector/Scorer'],
        defaultTier: 'elite',
        defaultAutos: ['elite', 'multiCycle', 'preloadPlus'],
        defaultHP: 'average',
        inactiveBehavior: 'hoard',
        defenseRole: 'none',
        defenseTarget: 'none'
    },
    endgameFocused: {
        name: 'Endgame Focused',
        icon: '\u{1F9D7}',
        description: 'All 3 robots prioritize climbing the tower for big endgame points. Moderate fuel scoring, but aims to secure the Traversal RP (50+ climb pts).',
        guide: 'Best when: Robots have reliable climbers. Even mid-tier climbers at L1(10)+L2(20)+L3(30)=60pts earns RP.',
        roles: ['scorer', 'scorer', 'climber'],
        roleLabels: ['Scorer & Climber', 'Scorer & Climber', 'Priority Climber'],
        defaultTier: 'mid',
        defaultAutos: ['shoot3', 'shoot3', 'shoot1'],
        defaultHP: 'average',
        inactiveBehavior: 'reposition',
        defenseRole: 'none',
        defenseTarget: 'none'
    },
    autoFocused: {
        name: 'Autonomous Focused',
        icon: '\u{1F916}',
        description: 'All 3 robots run strong autonomous routines to score early and win the auto phase, controlling which hub becomes active first.',
        guide: 'Best when: Robots have reliable multi-cycle autos. Winning auto = choosing the hub shift order.',
        roles: ['scorer', 'scorer', 'scorer'],
        roleLabels: ['Auto Specialist #1', 'Auto Specialist #2', 'Auto Specialist #3'],
        defaultTier: 'elite',
        defaultAutos: ['elite', 'multiCycle', 'preloadPlus'],
        defaultHP: 'average',
        inactiveBehavior: 'hoard',
        defenseRole: 'none',
        defenseTarget: 'none'
    },
    balanced: {
        name: 'Balanced / Flex',
        icon: '\u2696\uFE0F',
        description: 'A well-rounded strategy: moderate scoring, moderate climbing, moderate defense. Adaptable to any situation.',
        guide: 'Best when: Uncertain about opponents, or all robots are similar mid-tier capability. Safe default choice.',
        roles: ['scorer', 'scorer', 'scorer'],
        roleLabels: ['Flex #1', 'Flex #2', 'Flex #3'],
        defaultTier: 'mid',
        defaultAutos: ['shoot3', 'shoot3', 'shoot1'],
        defaultHP: 'average',
        inactiveBehavior: 'hoard',
        defenseRole: 'none',
        defenseTarget: 'none'
    },
    duoClimb: {
        name: '2 Offense + 1 Climber',
        icon: '\u{1F3D4}\uFE0F',
        description: '2 robots focus on scoring fuel while 1 robot prioritizes early and reliable climbing for guaranteed Traversal RP (50+ climb pts).',
        guide: 'Best when: One robot has a very reliable climber. Secures the Traversal RP while still scoring competitively.',
        roles: ['scorer', 'scorer', 'climber'],
        roleLabels: ['Scorer #1', 'Scorer #2', 'Dedicated Climber'],
        defaultTier: 'mid',
        defaultAutos: ['shoot5', 'shoot3', 'shoot1'],
        defaultHP: 'average',
        inactiveBehavior: 'hoard',
        defenseRole: 'none',
        defenseTarget: 'none'
    },
    denial: {
        name: 'Full Denial / Disruption',
        icon: '\u{1F6AB}',
        description: 'All 3 robots focus on blocking opponents: guarding fuel depots, clogging chokepoints, and preventing opponent scoring. Minimal own scoring.',
        guide: 'Best when: Your robots can\'t outscore opponents. Trading your low output for heavy opponent disruption. High foul risk!',
        roles: ['defender', 'defender', 'defender'],
        roleLabels: ['Chokepoint Blocker', 'Hub Guard', 'Zone Denier'],
        defaultTier: 'mid',
        defaultAutos: ['leaveOnly', 'leaveOnly', 'none'],
        defaultHP: 'average',
        inactiveBehavior: 'defend',
        defenseRole: 'allDefense',
        defenseTarget: 'chokepoint'
    }
};

// --- MATCH CONSTANTS ---
const MATCH = {
    autoDuration: 20,
    transitionDuration: 10,
    shiftDuration: 25,
    shiftCount: 4,
    endgameDuration: 30,
    totalDuration: 240,
    autoClimbL1Pts: 15,
    teleopClimbPts: { 1: 10, 2: 20, 3: 30 },
    fuelPerPoint: 1,
    rpEnergized: 100,
    rpSupercharged: 360,
    rpTraversal: 50,
    foulMinor: 5,
    foulMajor: 15
};

const FUEL = {
    totalOnField: 504,
    preloadPerRobot: 8,
    depotPerAlliance: 24,
    neutralZone: 360,
    outpostPerAlliance: 24
};

// --- REALISM CONFIG (toggled from UI) ---
const REALISM = {
    breakdown: true,
    brownout: true,
    fouls: true,
    congestion: true
};

// --- UTILITY FUNCTIONS ---
function rand(min, max) {
    return min + Math.random() * (max - min);
}

function applyVariance(value, variance = 0.15) {
    return value * rand(1 - variance, 1 + variance);
}

function rollProbability(prob) {
    return Math.random() < prob;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// --- FIELD GEOMETRY ---
const FieldGeometry = {
    distanceTiers: {
        close: { accuracyMod: 0.10, traverseTime: 0.6 },
        mid: { accuracyMod: 0.00, traverseTime: 1.0 },
        far: { accuracyMod: -0.15, traverseTime: 1.4 }
    },
    getShootingPosition(tactic) {
        if (tactic.defenseRole !== 'none') return 'far';
        if (tactic.inactiveBehavior === 'reposition') return 'close';
        return 'mid';
    },
    getCongestionPenalty(robotsInZone) {
        if (!REALISM.congestion) return 0;
        return robotsInZone >= 3 ? (robotsInZone - 2) * 0.5 : 0;
    }
};

// --- FOUL ENGINE ---
const FoulEngine = {
    generate(defenseRole, defenseTarget) {
        if (!REALISM.fouls) return { minor: 0, major: 0 };
        if (defenseRole === 'none') {
            return { minor: rollProbability(0.3) ? 1 : 0, major: 0 };
        }
        let minorCount = 0, majorCount = 0;
        if (defenseRole === 'oneDefender') {
            minorCount = Math.floor(rand(0, 3));
            majorCount = rollProbability(0.25) ? 1 : 0;
        } else if (defenseRole === 'allDefense') {
            minorCount = Math.floor(rand(1, 4));
            majorCount = rollProbability(0.4) ? 1 : 0;
            if (rollProbability(0.15)) majorCount += 1;
        }
        if (defenseTarget === 'chokepoint') minorCount += rollProbability(0.3) ? 1 : 0;
        return { minor: minorCount, major: majorCount };
    },
    calculatePenaltyPoints(fouls) {
        return fouls.minor * MATCH.foulMinor + fouls.major * MATCH.foulMajor;
    }
};

// --- RELIABILITY ENGINE ---
const ReliabilityEngine = {
    rollStatus(tier) {
        if (!REALISM.breakdown) return 'full';
        const r = Math.random();
        if (r < tier.reliability.dead) return 'dead';
        if (r < tier.reliability.dead + tier.reliability.partial) return 'partial';
        return 'full';
    },
    getOutputMultiplier(status, tier) {
        if (status === 'dead') return 0;
        if (status === 'partial') return 1 - tier.reliability.partialReduction;
        return 1;
    },
    rollBrownout(tier, elapsedFraction) {
        if (!REALISM.brownout) return false;
        const adjustedRisk = tier.brownout.risk * (0.5 + elapsedFraction);
        return rollProbability(adjustedRisk);
    }
};

// --- HUMAN PLAYER SCORING ---
function simulateHumanPlayer(hpTier, duration, isHubActive) {
    if (!isHubActive) return { scored: 0, thrown: 0 };
    const hp = HP_TIERS[hpTier];
    const thrown = Math.floor(applyVariance(hp.throwRate * duration, 0.20));
    const scored = Math.floor(thrown * applyVariance(hp.accuracy, 0.10));
    return { scored, thrown };
}

// --- AUTONOMOUS SIMULATION ---
function simulateAutonomous(alliance) {
    let totalFuelScored = 0;
    let totalClimbPts = 0;
    const robotResults = [];

    for (const robot of alliance.robots) {
        const autoTier = AUTO_TIERS[robot.autoTier];
        const robotTier = ROBOT_TIERS[robot.tier];
        let fuelScored = 0;
        let climbPts = 0;
        let leaveZone = false;

        // Roll auto reliability
        const autoSucceeds = rollProbability(autoTier.reliability);

        if (autoSucceeds) {
            leaveZone = autoTier.leaveZone;

            // Preload scoring — limited by shoot rate × 20s and accuracy
            const maxShootable = Math.min(autoTier.preloadScored, robotTier.fuel.shootRate * MATCH.autoDuration);
            fuelScored += Math.floor(applyVariance(maxShootable, 0.15) * applyVariance(robotTier.fuel.accuracy, 0.05));

            // Extra pickup cycles
            if (autoTier.extraPickup > 0) {
                const cycleTime = robotTier.drivetrain.fieldTraverse + (autoTier.extraPickup / robotTier.fuel.intakeRate);
                const timeForExtra = MATCH.autoDuration - (autoTier.preloadScored / robotTier.fuel.shootRate) - 2;
                if (timeForExtra > 0) {
                    const extraShotable = Math.min(autoTier.extraPickup, timeForExtra * robotTier.fuel.shootRate * 0.6);
                    fuelScored += Math.floor(applyVariance(extraShotable, 0.25) * applyVariance(robotTier.fuel.accuracy, 0.10));
                }
            }

            // L1 climb in auto
            if (autoTier.l1Climb && rollProbability(robotTier.climber.reliability)) {
                climbPts = MATCH.autoClimbL1Pts;
            }
        } else {
            // Auto failure — partial results
            if (autoTier.preloadScored > 0 && rollProbability(0.3)) {
                fuelScored = Math.floor(rand(0, autoTier.preloadScored * 0.3));
            }
            leaveZone = autoTier.leaveZone && rollProbability(0.5);
        }

        fuelScored = Math.max(0, fuelScored);
        totalFuelScored += fuelScored;
        totalClimbPts += climbPts;
        robotResults.push({ fuelScored, climbPts, leaveZone, autoSucceeded: autoSucceeds });
    }

    // Human player auto scoring
    const hpResult = simulateHumanPlayer(alliance.hpTier, MATCH.autoDuration, true);
    totalFuelScored += hpResult.scored;

    return {
        fuelScored: totalFuelScored,
        climbPts: totalClimbPts,
        hpScored: hpResult.scored,
        robotResults
    };
}

// --- TELEOP SIMULATION ---
function simulateTeleop(redAlliance, blueAlliance, redAutoFuel, blueAutoFuel, robotStatuses) {
    // Determine shift order: loser of auto gets first active hub
    const redWonAuto = redAutoFuel > blueAutoFuel;
    // Shifts: if red won auto, red hub is inactive first (blue gets first active)
    // Shift 1: red=inactive, blue=active
    // Shift 2: red=active, blue=inactive
    // etc.
    const shifts = [];
    for (let i = 0; i < MATCH.shiftCount; i++) {
        if (redWonAuto) {
            shifts.push({ redActive: i % 2 === 1, blueActive: i % 2 === 0 });
        } else if (blueAutoFuel > redAutoFuel) {
            shifts.push({ redActive: i % 2 === 0, blueActive: i % 2 === 1 });
        } else {
            // Tie — alternate starting with red
            shifts.push({ redActive: i % 2 === 0, blueActive: i % 2 === 1 });
        }
    }

    let redFuel = 0, blueFuel = 0;
    let redFuelInactive = 0, blueFuelInactive = 0;

    // Track hopper state per robot
    const redHoppers = redAlliance.robots.map(r => ({ fuel: 0, capacity: ROBOT_TIERS[r.tier].fuel.hopperCapacity }));
    const blueHoppers = blueAlliance.robots.map(r => ({ fuel: 0, capacity: ROBOT_TIERS[r.tier].fuel.hopperCapacity }));

    // Calculate defense effects
    const redDefense = getDefenseEffect(redAlliance);
    const blueDefense = getDefenseEffect(blueAlliance);

    // --- TRANSITION PERIOD (10s) ---
    // Robots reposition, no scoring
    // Hoarders start loading
    for (let i = 0; i < redAlliance.robots.length; i++) {
        const r = redAlliance.robots[i];
        const tier = ROBOT_TIERS[r.tier];
        const status = robotStatuses.red[i];
        if (status === 'dead') continue;
        const mult = ReliabilityEngine.getOutputMultiplier(status, tier);
        if (getTacticInactiveBehavior(r) === 'hoard') {
            redHoppers[i].fuel = Math.min(redHoppers[i].capacity, Math.floor(tier.fuel.intakeRate * MATCH.transitionDuration * 0.5 * mult));
        }
    }
    for (let i = 0; i < blueAlliance.robots.length; i++) {
        const r = blueAlliance.robots[i];
        const tier = ROBOT_TIERS[r.tier];
        const status = robotStatuses.blue[i];
        if (status === 'dead') continue;
        const mult = ReliabilityEngine.getOutputMultiplier(status, tier);
        if (getTacticInactiveBehavior(r) === 'hoard') {
            blueHoppers[i].fuel = Math.min(blueHoppers[i].capacity, Math.floor(tier.fuel.intakeRate * MATCH.transitionDuration * 0.5 * mult));
        }
    }

    // --- ALLIANCE SHIFTS (4 × 25s) ---
    for (let shiftIdx = 0; shiftIdx < MATCH.shiftCount; shiftIdx++) {
        const shift = shifts[shiftIdx];
        const shiftTime = MATCH.shiftDuration;

        // Red alliance this shift
        const redResult = simulateAllianceShift(redAlliance, shift.redActive, shiftTime, redHoppers, blueDefense, robotStatuses.red, shiftIdx);
        redFuel += redResult.activeScored;
        redFuelInactive += redResult.inactiveCollected;

        // Blue alliance this shift
        const blueResult = simulateAllianceShift(blueAlliance, shift.blueActive, shiftTime, blueHoppers, redDefense, robotStatuses.blue, shiftIdx);
        blueFuel += blueResult.activeScored;
        blueFuelInactive += blueResult.inactiveCollected;

        // HP scoring (only when hub is active)
        if (shift.redActive) {
            redFuel += simulateHumanPlayer(redAlliance.hpTier, shiftTime, true).scored;
        }
        if (shift.blueActive) {
            blueFuel += simulateHumanPlayer(blueAlliance.hpTier, shiftTime, true).scored;
        }
    }

    return { redFuel, blueFuel, redFuelInactive, blueFuelInactive, shifts };
}

function simulateAllianceShift(alliance, isActive, shiftTime, hoppers, opponentDefense, statuses, shiftIdx) {
    let activeScored = 0;
    let inactiveCollected = 0;

    const defenseDisruption = opponentDefense.totalDisruption;
    const congestionPenalty = FieldGeometry.getCongestionPenalty(
        alliance.robots.filter((r, i) => statuses[i] !== 'dead' && !isDefender(r)).length
    );

    for (let i = 0; i < alliance.robots.length; i++) {
        const robot = alliance.robots[i];
        const tier = ROBOT_TIERS[robot.tier];
        const status = statuses[i];

        if (status === 'dead') continue;
        const mult = ReliabilityEngine.getOutputMultiplier(status, tier);

        // Check for brownout
        const elapsed = (MATCH.transitionDuration + shiftIdx * MATCH.shiftDuration) / (MATCH.totalDuration - MATCH.autoDuration);
        if (ReliabilityEngine.rollBrownout(tier, elapsed)) {
            continue; // Lost this shift to brownout
        }

        if (isDefender(robot)) {
            // Defender doesn't score
            continue;
        }

        const shootPos = FieldGeometry.getShootingPosition(TACTICS[robot.tactic] || {});
        const accuracyMod = FieldGeometry.distanceTiers[shootPos]?.accuracyMod || 0;
        const traverseMod = FieldGeometry.distanceTiers[shootPos]?.traverseTime || 1.0;

        if (isActive) {
            // ACTIVE: Score from hopper first, then cycle
            const hopperDump = hoppers[i].fuel;
            if (hopperDump > 0) {
                const dumpTime = hopperDump / tier.fuel.shootRate;
                const acc = clamp(tier.fuel.accuracy + accuracyMod, 0.3, 0.99);
                activeScored += Math.floor(applyVariance(hopperDump * acc * mult, 0.10));
                hoppers[i].fuel = 0;

                // Remaining time for cycling
                const remainTime = shiftTime - dumpTime;
                if (remainTime > 0) {
                    activeScored += simulateCycles(tier, remainTime, acc, mult, defenseDisruption, congestionPenalty, traverseMod);
                }
            } else {
                const acc = clamp(tier.fuel.accuracy + accuracyMod, 0.3, 0.99);
                activeScored += simulateCycles(tier, shiftTime, acc, mult, defenseDisruption, congestionPenalty, traverseMod);
            }
        } else {
            // INACTIVE: Behavior depends on tactic
            const behavior = getTacticInactiveBehavior(robot);
            if (behavior === 'hoard') {
                const collectTime = shiftTime * 0.9;
                const collected = Math.floor(tier.fuel.intakeRate * collectTime * mult * 0.8);
                hoppers[i].fuel = Math.min(hoppers[i].capacity, hoppers[i].fuel + collected);
                inactiveCollected += collected;
            } else if (behavior === 'stockpile') {
                // Aggressive hoarding — collect more fuel to dump on next active shift
                const collected = Math.floor(tier.fuel.intakeRate * shiftTime * mult);
                hoppers[i].fuel = Math.min(hoppers[i].capacity, hoppers[i].fuel + collected);
                inactiveCollected += collected;
            } else if (behavior === 'reposition') {
                // Just position for next active period
            }
            // 'defend' is handled via defense system
        }
    }

    return { activeScored: Math.max(0, activeScored), inactiveCollected };
}

function simulateCycles(tier, time, accuracy, outputMult, defenseDisruption, congestionPenalty, traverseMod) {
    const cycleTime = (tier.drivetrain.fieldTraverse * traverseMod) +
        (tier.fuel.hopperCapacity / tier.fuel.intakeRate) * 0.5 +
        (tier.fuel.hopperCapacity / tier.fuel.shootRate) +
        tier.drivetrain.bumpPenalty * 0.5 +
        congestionPenalty;

    const effectiveCycleTime = cycleTime * (1 + defenseDisruption);
    const cycles = Math.max(0, time / effectiveCycleTime);
    const fuelPerCycle = tier.fuel.hopperCapacity * 0.7; // Don't always fill completely
    const totalFuel = cycles * fuelPerCycle * accuracy * outputMult;
    return Math.floor(applyVariance(totalFuel, 0.15));
}

// --- ENDGAME SIMULATION ---
function simulateEndgame(alliance, robotStatuses, priorFuelScored) {
    let fuelScored = 0;
    let climbPts = 0;
    const climbResults = [];
    const endgameTime = MATCH.endgameDuration;

    for (let i = 0; i < alliance.robots.length; i++) {
        const robot = alliance.robots[i];
        const tier = ROBOT_TIERS[robot.tier];
        const tactic = TACTICS[robot.tactic] || {};
        const status = robotStatuses[i];

        if (status === 'dead') {
            climbResults.push({ level: 0, pts: 0, success: false });
            continue;
        }

        const mult = ReliabilityEngine.getOutputMultiplier(status, tier);

        // Decide climb level
        let targetLevel = Math.min(tier.climber.maxLevel, 3);
        if (tactic.name === 'Endgame Focused') {
            targetLevel = tier.climber.maxLevel; // Always go for max
        }

        // Climb timing
        let climbTime;
        if (targetLevel === 3) climbTime = tier.climber.l3Time;
        else if (targetLevel === 2) climbTime = tier.climber.l3Time * 0.6;
        else climbTime = tier.climber.l1Time;

        // Time split: score first, then climb
        const scoreTime = Math.max(0, endgameTime - climbTime - 2);
        const shootPos = FieldGeometry.getShootingPosition(tactic);
        const accuracyMod = FieldGeometry.distanceTiers[shootPos]?.accuracyMod || 0;
        const acc = clamp(tier.fuel.accuracy + accuracyMod, 0.3, 0.99);

        // Score during endgame (both hubs active)
        if (scoreTime > 0 && !isDefender(robot)) {
            const endgameFuel = simulateCycles(tier, scoreTime, acc, mult, 0, 0, 1.0);
            fuelScored += endgameFuel;
        }

        // Attempt climb
        if (targetLevel > 0 && rollProbability(tier.climber.reliability * mult)) {
            const pts = MATCH.teleopClimbPts[targetLevel] || 0;
            climbPts += pts;
            climbResults.push({ level: targetLevel, pts, success: true });
        } else {
            // Failed climb — maybe get L1 if aimed higher
            if (targetLevel > 1 && rollProbability(0.5)) {
                climbPts += MATCH.teleopClimbPts[1];
                climbResults.push({ level: 1, pts: MATCH.teleopClimbPts[1], success: true });
            } else {
                climbResults.push({ level: 0, pts: 0, success: false });
            }
        }
    }

    // HP in endgame (both active)
    const hpResult = simulateHumanPlayer(alliance.hpTier, endgameTime, true);
    fuelScored += hpResult.scored;

    return { fuelScored, climbPts, climbResults, hpScored: hpResult.scored };
}

// --- DEFENSE HELPERS ---
function getDefenseEffect(alliance) {
    let totalDisruption = 0;
    let defenderCount = 0;
    for (const robot of alliance.robots) {
        if (isDefender(robot)) {
            const tier = ROBOT_TIERS[robot.tier];
            totalDisruption += tier.defense.disruption;
            defenderCount++;
        }
    }
    return { totalDisruption, defenderCount };
}

function isDefender(robot) {
    const tactic = TACTICS[robot.tactic];
    if (!tactic) return false;
    if (tactic.defenseRole === 'allDefense') return true;
    if (tactic.defenseRole === 'oneDefender') {
        return robot.isDefender === true;
    }
    return false;
}

function getTacticInactiveBehavior(robot) {
    const tactic = TACTICS[robot.tactic];
    return tactic ? tactic.inactiveBehavior : 'hoard';
}

// --- RP CALCULATION ---
function calculateRP(redScore, blueScore, redFuelActive, blueFuelActive, redClimbPts, blueClimbPts) {
    const redRP = { win: 0, energized: 0, supercharged: 0, traversal: 0, total: 0 };
    const blueRP = { win: 0, energized: 0, supercharged: 0, traversal: 0, total: 0 };

    // Win RP
    if (redScore > blueScore) {
        redRP.win = 3;
    } else if (blueScore > redScore) {
        blueRP.win = 3;
    } else {
        redRP.win = 1;
        blueRP.win = 1;
    }

    // Energized RP
    if (redFuelActive >= MATCH.rpEnergized) redRP.energized = 1;
    if (blueFuelActive >= MATCH.rpEnergized) blueRP.energized = 1;

    // Supercharged RP
    if (redFuelActive >= MATCH.rpSupercharged) redRP.supercharged = 1;
    if (blueFuelActive >= MATCH.rpSupercharged) blueRP.supercharged = 1;

    // Traversal RP
    if (redClimbPts >= MATCH.rpTraversal) redRP.traversal = 1;
    if (blueClimbPts >= MATCH.rpTraversal) blueRP.traversal = 1;

    redRP.total = redRP.win + redRP.energized + redRP.supercharged + redRP.traversal;
    blueRP.total = blueRP.win + blueRP.energized + blueRP.supercharged + blueRP.traversal;

    return { redRP, blueRP };
}

// --- FULL MATCH SIMULATION ---
function runMatch(redAlliance, blueAlliance) {
    // Roll reliability per robot
    const robotStatuses = {
        red: redAlliance.robots.map(r => ReliabilityEngine.rollStatus(ROBOT_TIERS[r.tier])),
        blue: blueAlliance.robots.map(r => ReliabilityEngine.rollStatus(ROBOT_TIERS[r.tier]))
    };

    // Assign defender flags for 2+1 defense
    assignDefenderRoles(redAlliance);
    assignDefenderRoles(blueAlliance);

    // --- Autonomous ---
    const redAuto = simulateAutonomous(redAlliance);
    const blueAuto = simulateAutonomous(blueAlliance);

    // --- Teleop ---
    const teleop = simulateTeleop(redAlliance, blueAlliance, redAuto.fuelScored, blueAuto.fuelScored, robotStatuses);

    // --- Endgame ---
    const redEndgame = simulateEndgame(redAlliance, robotStatuses.red, redAuto.fuelScored + teleop.redFuel);
    const blueEndgame = simulateEndgame(blueAlliance, robotStatuses.blue, blueAuto.fuelScored + teleop.blueFuel);

    // --- Fouls ---
    const redTactic = TACTICS[redAlliance.robots[0]?.tactic] || {};
    const blueTactic = TACTICS[blueAlliance.robots[0]?.tactic] || {};
    const redFouls = FoulEngine.generate(redTactic.defenseRole || 'none', redTactic.defenseTarget || 'none');
    const blueFouls = FoulEngine.generate(blueTactic.defenseRole || 'none', blueTactic.defenseTarget || 'none');
    const redPenaltyGiven = FoulEngine.calculatePenaltyPoints(redFouls);
    const bluePenaltyGiven = FoulEngine.calculatePenaltyPoints(blueFouls);

    // --- Totals ---
    const redFuelActive = redAuto.fuelScored + teleop.redFuel + redEndgame.fuelScored;
    const blueFuelActive = blueAuto.fuelScored + teleop.blueFuel + blueEndgame.fuelScored;
    const redClimbTotal = redAuto.climbPts + redEndgame.climbPts;
    const blueClimbTotal = blueAuto.climbPts + blueEndgame.climbPts;

    const redScore = redFuelActive + redClimbTotal + bluePenaltyGiven; // Opponent fouls add to your score
    const blueScore = blueFuelActive + blueClimbTotal + redPenaltyGiven;

    // --- RP ---
    const rp = calculateRP(redScore, blueScore, redFuelActive, blueFuelActive, redClimbTotal, blueClimbTotal);

    // --- TIMELINE (cumulative score at each phase) ---
    // Split teleop fuel evenly across 4 shifts for the chart
    var redTeleopPerShift = Math.floor(teleop.redFuel / 4);
    var blueTeleopPerShift = Math.floor(teleop.blueFuel / 4);
    var redAutoTotal = redAuto.fuelScored + redAuto.climbPts + redAuto.hpScored;
    var blueAutoTotal = blueAuto.fuelScored + blueAuto.climbPts + blueAuto.hpScored;
    var redEndTotal = redEndgame.fuelScored + redEndgame.climbPts + redEndgame.hpScored;
    var blueEndTotal = blueEndgame.fuelScored + blueEndgame.climbPts + blueEndgame.hpScored;

    var timeline = [
        { phase: 'Auto (0-20s)', time: 20, redPts: redAutoTotal, bluePts: blueAutoTotal, redCum: redAutoTotal, blueCum: blueAutoTotal },
        { phase: 'Teleop Shift 1', time: 45, redPts: redTeleopPerShift, bluePts: blueTeleopPerShift, redCum: 0, blueCum: 0 },
        { phase: 'Teleop Shift 2', time: 70, redPts: redTeleopPerShift, bluePts: blueTeleopPerShift, redCum: 0, blueCum: 0 },
        { phase: 'Teleop Shift 3', time: 95, redPts: redTeleopPerShift, bluePts: blueTeleopPerShift, redCum: 0, blueCum: 0 },
        { phase: 'Teleop Shift 4', time: 120, redPts: teleop.redFuel - redTeleopPerShift * 3, bluePts: teleop.blueFuel - blueTeleopPerShift * 3, redCum: 0, blueCum: 0 },
        { phase: 'Endgame (last 30s)', time: 150, redPts: redEndTotal, bluePts: blueEndTotal, redCum: 0, blueCum: 0 }
    ];
    // Compute cumulative
    var rCum = 0, bCum = 0;
    for (var ti = 0; ti < timeline.length; ti++) {
        rCum += timeline[ti].redPts;
        bCum += timeline[ti].bluePts;
        timeline[ti].redCum = rCum;
        timeline[ti].blueCum = bCum;
    }

    // --- PER-ROBOT CONTRIBUTIONS (estimated) ---
    // For each robot, estimate their fuel contribution from auto
    var redRobotContrib = [];
    var blueRobotContrib = [];
    for (var ri = 0; ri < 3; ri++) {
        var rBot = redAlliance.robots[ri];
        var bBot = blueAlliance.robots[ri];
        var rAutoT = AUTO_TIERS[rBot.autoTier] || AUTO_TIERS.none;
        var bAutoT = AUTO_TIERS[bBot.autoTier] || AUTO_TIERS.none;
        var rTier = ROBOT_TIERS[rBot.tier] || ROBOT_TIERS.mid;
        var bTier = ROBOT_TIERS[bBot.tier] || ROBOT_TIERS.mid;
        var rStat = robotStatuses.red[ri];
        var bStat = robotStatuses.blue[ri];
        // Estimated teleop contribution based on tier output relative to alliance total
        var rTeleopEst = rStat === 'dead' ? 0 : Math.floor(teleop.redFuel * (rTier.fuel.accuracy / (rTier.fuel.accuracy * 3) || 0.33));
        var bTeleopEst = bStat === 'dead' ? 0 : Math.floor(teleop.blueFuel * (bTier.fuel.accuracy / (bTier.fuel.accuracy * 3) || 0.33));
        redRobotContrib.push({
            autoFuel: Math.floor(rAutoT.preloadScored * rTier.fuel.accuracy),
            teleopFuel: rTeleopEst,
            climbPts: redEndgame.climbResults[ri] ? (redEndgame.climbResults[ri].success ? redEndgame.climbResults[ri].pts : 0) : 0,
            status: rStat
        });
        blueRobotContrib.push({
            autoFuel: Math.floor(bAutoT.preloadScored * bTier.fuel.accuracy),
            teleopFuel: bTeleopEst,
            climbPts: blueEndgame.climbResults[ri] ? (blueEndgame.climbResults[ri].success ? blueEndgame.climbResults[ri].pts : 0) : 0,
            status: bStat
        });
    }

    return {
        redScore: redScore, blueScore: blueScore,
        red: {
            auto: { fuel: redAuto.fuelScored, climb: redAuto.climbPts, hp: redAuto.hpScored },
            teleop: { fuel: teleop.redFuel, fuelInactive: teleop.redFuelInactive },
            endgame: { fuel: redEndgame.fuelScored, climb: redEndgame.climbPts, climbResults: redEndgame.climbResults, hp: redEndgame.hpScored },
            fuelActive: redFuelActive,
            climbTotal: redClimbTotal,
            foulsCommitted: redFouls,
            penaltyGiven: redPenaltyGiven,
            rp: rp.redRP,
            statuses: robotStatuses.red,
            robotContrib: redRobotContrib
        },
        blue: {
            auto: { fuel: blueAuto.fuelScored, climb: blueAuto.climbPts, hp: blueAuto.hpScored },
            teleop: { fuel: teleop.blueFuel, fuelInactive: teleop.blueFuelInactive },
            endgame: { fuel: blueEndgame.fuelScored, climb: blueEndgame.climbPts, climbResults: blueEndgame.climbResults, hp: blueEndgame.hpScored },
            fuelActive: blueFuelActive,
            climbTotal: blueClimbTotal,
            foulsCommitted: blueFouls,
            penaltyGiven: bluePenaltyGiven,
            rp: rp.blueRP,
            statuses: robotStatuses.blue,
            robotContrib: blueRobotContrib
        },
        shifts: teleop.shifts,
        timeline: timeline
    };
}

function assignDefenderRoles(alliance) {
    const tactic = TACTICS[alliance.robots[0]?.tactic];
    if (tactic && tactic.defenseRole === 'oneDefender') {
        // Find the lowest-tier robot to be defender
        let worstIdx = 0;
        let worstScore = Infinity;
        for (let i = 0; i < alliance.robots.length; i++) {
            const t = ROBOT_TIERS[alliance.robots[i].tier];
            const score = t.fuel.shootRate * t.fuel.accuracy;
            if (score < worstScore) {
                worstScore = score;
                worstIdx = i;
            }
        }
        alliance.robots.forEach((r, i) => { r.isDefender = (i === worstIdx); });
    } else {
        alliance.robots.forEach(r => { r.isDefender = false; });
    }
}

// --- BATCH SIMULATION ---
function runBatchSimulation(redAlliance, blueAlliance, n = 200) {
    const results = {
        red: { scores: [], rps: [], fuelActive: [], climbPts: [], penalties: [], rpBreakdown: { win: 0, energized: 0, supercharged: 0, traversal: 0 } },
        blue: { scores: [], rps: [], fuelActive: [], climbPts: [], penalties: [], rpBreakdown: { win: 0, energized: 0, supercharged: 0, traversal: 0 } },
        wins: { red: 0, blue: 0, tie: 0 }
    };

    for (let i = 0; i < n; i++) {
        // Deep-copy alliances to avoid mutation
        const rCopy = deepCopyAlliance(redAlliance);
        const bCopy = deepCopyAlliance(blueAlliance);
        const match = runMatch(rCopy, bCopy);

        results.red.scores.push(match.redScore);
        results.blue.scores.push(match.blueScore);
        results.red.rps.push(match.red.rp.total);
        results.blue.rps.push(match.blue.rp.total);
        results.red.fuelActive.push(match.red.fuelActive);
        results.blue.fuelActive.push(match.blue.fuelActive);
        results.red.climbPts.push(match.red.climbTotal);
        results.blue.climbPts.push(match.blue.climbTotal);
        results.red.penalties.push(match.red.penaltyGiven);
        results.blue.penalties.push(match.blue.penaltyGiven);

        // RP breakdown
        if (match.red.rp.win === 3) results.wins.red++;
        else if (match.blue.rp.win === 3) results.wins.blue++;
        else results.wins.tie++;

        results.red.rpBreakdown.win += match.red.rp.win > 0 ? 1 : 0;
        results.red.rpBreakdown.energized += match.red.rp.energized;
        results.red.rpBreakdown.supercharged += match.red.rp.supercharged;
        results.red.rpBreakdown.traversal += match.red.rp.traversal;

        results.blue.rpBreakdown.win += match.blue.rp.win > 0 ? 1 : 0;
        results.blue.rpBreakdown.energized += match.blue.rp.energized;
        results.blue.rpBreakdown.supercharged += match.blue.rp.supercharged;
        results.blue.rpBreakdown.traversal += match.blue.rp.traversal;
    }

    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const pct = (val) => ((val / n) * 100).toFixed(1);

    return {
        n,
        red: {
            avgScore: avg(results.red.scores).toFixed(1),
            avgRP: avg(results.red.rps).toFixed(2),
            winRate: pct(results.wins.red),
            tieRate: pct(results.wins.tie),
            energizedRate: pct(results.red.rpBreakdown.energized),
            superchargedRate: pct(results.red.rpBreakdown.supercharged),
            traversalRate: pct(results.red.rpBreakdown.traversal),
            avgFuelActive: avg(results.red.fuelActive).toFixed(1),
            avgClimbPts: avg(results.red.climbPts).toFixed(1),
            avgPenalty: avg(results.red.penalties).toFixed(1)
        },
        blue: {
            avgScore: avg(results.blue.scores).toFixed(1),
            avgRP: avg(results.blue.rps).toFixed(2),
            winRate: pct(results.wins.blue),
            tieRate: pct(results.wins.tie),
            energizedRate: pct(results.blue.rpBreakdown.energized),
            superchargedRate: pct(results.blue.rpBreakdown.supercharged),
            traversalRate: pct(results.blue.rpBreakdown.traversal),
            avgFuelActive: avg(results.blue.fuelActive).toFixed(1),
            avgClimbPts: avg(results.blue.climbPts).toFixed(1),
            avgPenalty: avg(results.blue.penalties).toFixed(1)
        }
    };
}

// --- OPTIMAL TACTICS FINDER ---
function findOptimalTactics(tier = 'mid', autoTier = 'shoot3', hpTier = 'average', n = 100) {
    const tacticKeys = Object.keys(TACTICS);
    const results = [];

    for (const redTactic of tacticKeys) {
        for (const blueTactic of tacticKeys) {
            const redAlliance = createAlliance(redTactic, tier, autoTier, hpTier);
            const blueAlliance = createAlliance(blueTactic, tier, autoTier, hpTier);

            const batch = runBatchSimulation(redAlliance, blueAlliance, n);
            results.push({
                redTactic,
                blueTactic,
                redTacticName: TACTICS[redTactic].name,
                blueTacticName: TACTICS[blueTactic].name,
                red: batch.red,
                blue: batch.blue
            });
        }
    }

    // Sort by red avg RP (descending)
    results.sort((a, b) => parseFloat(b.red.avgRP) - parseFloat(a.red.avgRP));
    return results;
}

// --- ALLIANCE CREATION HELPER ---
// createAlliance: uses per-robot defaultAutos from the tactic definition
function createAlliance(tactic, tier, autoTier, hpTier) {
    var tacticDef = TACTICS[tactic];
    if (!tacticDef) tacticDef = TACTICS.balanced;
    var autos = tacticDef.defaultAutos || ['shoot3', 'shoot3', 'shoot1'];
    return {
        robots: [
            { tactic: tactic, tier: tier || tacticDef.defaultTier, autoTier: autoTier || autos[0], isDefender: false },
            { tactic: tactic, tier: tier || tacticDef.defaultTier, autoTier: autoTier || autos[1], isDefender: false },
            { tactic: tactic, tier: tier || tacticDef.defaultTier, autoTier: autoTier || autos[2], isDefender: false }
        ],
        hpTier: hpTier || tacticDef.defaultHP
    };
}

function createCustomAlliance(robots, hpTier) {
    return {
        robots: robots.map(r => ({
            tactic: r.tactic,
            tier: r.tier,
            autoTier: r.autoTier,
            isDefender: false
        })),
        hpTier: hpTier || 'average'
    };
}

function deepCopyAlliance(alliance) {
    return {
        robots: alliance.robots.map(r => ({ ...r })),
        hpTier: alliance.hpTier
    };
}

// --- EXPORTS (for use in app.js) ---
if (typeof window !== 'undefined') {
    window.Simulator = {
        ROBOT_TIERS, AUTO_TIERS, HP_TIERS, TACTICS, MATCH, FUEL, REALISM,
        runMatch, runBatchSimulation, findOptimalTactics,
        createAlliance, createCustomAlliance
    };
}
