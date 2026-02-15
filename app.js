// ============================================================
// FRC 2026 "REBUILT" Tactic Simulator — UI Controller
// ============================================================

var $ = function (id) { return document.getElementById(id); };

document.addEventListener('DOMContentLoaded', function () {
    if (!window.Simulator) {
        console.error('Simulator engine not loaded!');
        var el = $('resultsEmpty');
        if (el) el.innerHTML = '<div style="color:#ef4444;font-size:18px;">Error: simulator.js failed to load. Press F12 -> Console.</div>';
        return;
    }

    var Sim = window.Simulator;

    // --- Main Tab Switching ---
    setupMainTabs();
    // --- Info Sub-Nav ---
    setupInfoNav();
    // --- Build info content ---
    buildTierCards(Sim);
    buildTacticGuideSelector(Sim);
    // --- Simulator tab ---
    buildAllianceTacticSelect('red', Sim);
    buildAllianceTacticSelect('blue', Sim);
    updateRobotSlots('red', Sim);
    updateRobotSlots('blue', Sim);
    bindControls(Sim);
    bindRealismToggles(Sim);
    console.log('FRC 2026 REBUILT Tactic Simulator loaded!');
});

// ============================================================
// MAIN TAB SWITCHING (Information | Simulator)
// ============================================================
function setupMainTabs() {
    var tabInfo = $('tabInfo');
    var tabSim = $('tabSim');
    var panelInfo = $('panelInfo');
    var panelSim = $('panelSim');

    tabInfo.addEventListener('click', function () {
        tabInfo.className = 'main-tab main-tab--active';
        tabSim.className = 'main-tab';
        panelInfo.className = 'main-panel main-panel--active';
        panelSim.className = 'main-panel';
    });

    tabSim.addEventListener('click', function () {
        tabSim.className = 'main-tab main-tab--active';
        tabInfo.className = 'main-tab';
        panelSim.className = 'main-panel main-panel--active';
        panelInfo.className = 'main-panel';
    });
}

// ============================================================
// INFO SUB-NAV SWITCHING
// ============================================================
function setupInfoNav() {
    var nav = $('infoNav');
    if (!nav) return;
    var btns = nav.querySelectorAll('.info-nav__btn');
    for (var i = 0; i < btns.length; i++) {
        (function (btn) {
            btn.addEventListener('click', function () {
                // Deactivate all
                for (var j = 0; j < btns.length; j++) {
                    btns[j].className = 'info-nav__btn';
                }
                // Hide all sections
                var sections = document.querySelectorAll('.info-section');
                for (var k = 0; k < sections.length; k++) {
                    sections[k].className = 'info-section';
                }
                // Activate clicked
                btn.className = 'info-nav__btn info-nav__btn--active';
                var sec = $('sec_' + btn.getAttribute('data-section'));
                if (sec) sec.className = 'info-section info-section--active';
            });
        })(btns[i]);
    }
}

// ============================================================
// ROBOT TIER CARDS (dynamically from simulator data)
// ============================================================
function buildTierCards(Sim) {
    var container = $('tierCardsContainer');
    if (!container) return;
    var ROBOT_TIERS = Sim.ROBOT_TIERS;
    var TURRET_TYPES = Sim.TURRET_TYPES;
    var keys = Object.keys(ROBOT_TIERS);

    var colors = {
        t1_rookie: '#6b7280',
        t2_kitbot: '#ef4444',
        t3_everybot: '#f97316',
        t4_competitive: '#eab308',
        t5_advanced: '#22c55e',
        t6_ccbot: '#3b82f6',
        t7_worldclass: '#a855f7'
    };
    var descriptions = {
        t1_rookie: 'First-year team or severely limited resources. Barely functional; often breaks down. No climbing capability. ~Bottom 10% of FRC.',
        t2_kitbot: 'Standard kitbot with basic modifications. Can score slowly and climb L1. Benchmark for entry-level competitive play. ~25th percentile.',
        t3_everybot: 'Everybot-level — accessible build with reliable performance. Can climb L1-L2. Solid choice for teams with limited machining. ~40th percentile.',
        t4_competitive: 'Solid regional contender. Consistent scorer with moderate cycle times. Reliable L1-L2 climber. ~55th percentile.',
        t5_advanced: 'Strong district/regional contender. Fast cycles, good accuracy, L1-L3 capable. A strong pick in alliance selection. ~75th percentile.',
        t6_ccbot: 'WCP Competitive Concept level. Near-elite performance with fast intakes, high accuracy, and reliable L3 climbs. ~Top 10%.',
        t7_worldclass: 'Einstein finalist caliber. Blistering cycle times, near-perfect accuracy, and bulletproof reliability. The robot everyone wants. ~Top 2%.'
    };

    var html = '<div class="tier-cards-grid">';
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var t = ROBOT_TIERS[key];
        var c = colors[key] || '#8b5cf6';
        var turretName = t.defaultTurret ? (TURRET_TYPES[t.defaultTurret] ? TURRET_TYPES[t.defaultTurret].name : t.defaultTurret) : 'N/A';

        html += '<div class="tier-card">' +
            '<div class="tier-card__header" style="border-color:' + c + ';">' + t.name + '</div>' +
            '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">' + (descriptions[key] || '') + '</p>' +
            '<div style="font-size:11px;color:' + c + ';margin-bottom:8px;font-weight:600;">~' + (t.frcPercent || '?') + '% of FRC field</div>' +
            tierStat('Drivetrain Speed', t.drivetrain.effectiveSpeed + ' ft/s') +
            tierStat('Field Traverse', t.drivetrain.fieldTraverse + ' s') +
            tierStat('Intake Rate', t.fuel.intakeRate + ' fuel/s') +
            tierStat('Shoot Rate', t.fuel.shootRate + ' fuel/s') +
            tierStat('Fuel Accuracy', (t.fuel.accuracy * 100).toFixed(0) + '%') +
            tierStat('Hopper Capacity', t.fuel.hopperCapacity + ' fuel') +
            tierStat('Default Turret', turretName) +
            tierStat('Max Climb Level', t.climber.maxLevel > 0 ? 'L' + t.climber.maxLevel : 'None') +
            tierStat('Climb Reliability', (t.climber.reliability * 100).toFixed(0) + '%') +
            tierStat('Defense Disruption', (t.defense.disruption * 100).toFixed(0) + '%') +
            tierStat('Full Match Rate', (t.reliability.full * 100).toFixed(0) + '%') +
            tierStat('Dead Rate', (t.reliability.dead * 100).toFixed(1) + '%') +
            tierStat('Brownout Risk', (t.brownout.risk * 100).toFixed(0) + '%') +
            '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
}

function tierStat(label, value) {
    return '<div class="tier-stat">' +
        '<span class="tier-stat__label">' + label + '</span>' +
        '<span class="tier-stat__value">' + value + '</span>' +
        '</div>';
}

// ============================================================
// TACTIC GUIDE — Interactive Selector
// ============================================================
function buildTacticGuideSelector(Sim) {
    var container = $('tacticSelector');
    var detailBox = $('tacticDetail');
    if (!container) return;
    var TACTICS = Sim.TACTICS;
    var keys = Object.keys(TACTICS);
    var AUTO_TIERS = Sim.AUTO_TIERS;

    container.innerHTML = '';
    for (var i = 0; i < keys.length; i++) {
        (function (key) {
            var t = TACTICS[key];
            var btn = document.createElement('button');
            btn.className = 'tactic-selector__btn';
            btn.textContent = t.icon + '  ' + t.name;
            btn.addEventListener('click', function () {
                // Deactivate all
                var allBtns = container.querySelectorAll('.tactic-selector__btn');
                for (var j = 0; j < allBtns.length; j++) {
                    allBtns[j].className = 'tactic-selector__btn';
                }
                btn.className = 'tactic-selector__btn tactic-selector__btn--active';
                showTacticDetail(key, Sim);
            });
            container.appendChild(btn);
        })(keys[i]);
    }

    // Show first tactic by default
    if (keys.length > 0) {
        container.querySelector('.tactic-selector__btn').className = 'tactic-selector__btn tactic-selector__btn--active';
        showTacticDetail(keys[0], Sim);
    }
}

function showTacticDetail(key, Sim) {
    var detailBox = $('tacticDetail');
    if (!detailBox) return;
    var TACTICS = Sim.TACTICS;
    var AUTO_TIERS = Sim.AUTO_TIERS;
    var t = TACTICS[key];
    if (!t) return;

    var roles = t.roleLabels || ['Robot 1', 'Robot 2', 'Robot 3'];
    var roleTypes = t.roles || ['scorer', 'scorer', 'scorer'];
    var defaultAutos = t.defaultAutos || ['shoot3', 'shoot3', 'shoot1'];

    var roleColors = { scorer: '#22c55e', defender: '#ef4444', feeder: '#eab308', climber: '#a78bfa' };

    // Build role detail
    var roleHtml = '';
    for (var i = 0; i < 3; i++) {
        var rc = roleColors[roleTypes[i]] || 'var(--text-muted)';
        var autoName = AUTO_TIERS[defaultAutos[i]] ? AUTO_TIERS[defaultAutos[i]].name : defaultAutos[i];
        roleHtml += '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid var(--border-glass);border-radius:8px;">' +
            '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + rc + ';flex-shrink:0;"></span>' +
            '<div style="flex:1;">' +
            '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">' + roles[i] + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);">Role: ' + roleTypes[i] + ' \u2022 Default auto: ' + autoName + '</div>' +
            '</div>' +
            '</div>';
    }

    // Strength / weakness
    var defenseInfo = '';
    if (t.defenseRole && t.defenseRole !== 'none') {
        defenseInfo = '<div style="margin-top:12px;padding:10px 14px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:8px;font-size:12px;">' +
            '<strong style="color:#ef4444;">Defense:</strong> ' +
            'Robot in <em>' + t.defenseRole + '</em> role plays defense targeting <em>' + (t.defenseTarget || 'top scorer') + '</em>. ' +
            'This disrupts opponent cycles by 25-40% but increases foul risk.' +
            '</div>';
    }

    detailBox.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
        '<span style="font-size:32px;">' + t.icon + '</span>' +
        '<div>' +
        '<div style="font-size:20px;font-weight:700;color:var(--text-primary);">' + t.name + '</div>' +
        '<div style="font-size:13px;color:var(--text-muted);margin-top:2px;">Default tier: ' + (t.defaultTier || 't4_competitive') + ' · HP: ' + (t.defaultHP || 'average') + '</div>' +
        '</div>' +
        '</div>' +

        '<div style="margin-bottom:16px;padding:14px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:8px;">' +
        '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--blue-alliance);margin-bottom:6px;">Strategy Description</div>' +
        '<div style="font-size:14px;color:var(--text-secondary);line-height:1.6;">' + t.description + '</div>' +
        '</div>' +

        '<div style="margin-bottom:16px;padding:14px;background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.15);border-radius:8px;">' +
        '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--accent);margin-bottom:6px;">When to Use</div>' +
        '<div style="font-size:14px;color:var(--text-secondary);line-height:1.6;">' + (t.guide || 'General purpose tactic.') + '</div>' +
        '</div>' +

        '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);margin-bottom:8px;">Robot Role Assignments</div>' +
        '<div style="display:grid;gap:8px;margin-bottom:12px;">' + roleHtml + '</div>' +

        defenseInfo +

        '<div style="margin-top:16px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);border-radius:8px;font-size:12px;color:var(--text-muted);">' +
        '<strong>Inactive hub behavior:</strong> ' + (t.inactiveBehavior || 'hoard') + ' \u2022 ' +
        'Robots ' + (t.inactiveBehavior === 'hoard' ? 'hoard fuel during inactive shifts and dump when hub activates.' :
            t.inactiveBehavior === 'stockpile' ? 'stockpile fuel for massive dump when hub activates.' :
                'continue scoring at a reduced rate during inactive shifts.') +
        '</div>';
}

// ============================================================
// ALLIANCE TACTIC SELECTOR (in Simulator tab)
// ============================================================
function buildAllianceTacticSelect(color, Sim) {
    var select = $(color + 'Tactic');
    if (!select) return;
    var TACTICS = Sim.TACTICS;
    var keys = Object.keys(TACTICS);
    var html = '';
    for (var i = 0; i < keys.length; i++) {
        var t = TACTICS[keys[i]];
        html += '<option value="' + keys[i] + '"' + (keys[i] === 'balanced' ? ' selected' : '') + '>' + t.icon + ' ' + t.name + '</option>';
    }
    select.innerHTML = html;
    select.addEventListener('change', function () {
        updateTacticInfo(color, Sim);
        updateRobotSlots(color, Sim);
    });
    updateTacticInfo(color, Sim);
}

function updateTacticInfo(color, Sim) {
    var select = $(color + 'Tactic');
    var infoDiv = $(color + 'TacticInfo');
    if (!select || !infoDiv) return;
    var t = Sim.TACTICS[select.value];
    if (t) {
        infoDiv.style.display = 'block';
        infoDiv.innerHTML = '<div style="margin-bottom:4px;">' + t.description + '</div>' +
            '<div style="color:var(--accent);">' + (t.guide || '') + '</div>';
    }
}

// ============================================================
// PER-ROBOT SLOTS
// ============================================================
function updateRobotSlots(color, Sim) {
    var container = $(color + 'Robots');
    if (!container) return;
    var ROBOT_TIERS = Sim.ROBOT_TIERS;
    var AUTO_TIERS = Sim.AUTO_TIERS;
    var tacticKey = $(color + 'Tactic').value;
    var tactic = Sim.TACTICS[tacticKey] || Sim.TACTICS.balanced;
    var roles = tactic.roleLabels || ['Robot 1', 'Robot 2', 'Robot 3'];
    var defaultAutos = tactic.defaultAutos || ['shoot3', 'shoot3', 'shoot1'];
    container.innerHTML = '';

    for (var i = 0; i < 3; i++) {
        var role = roles[i];
        var isDefender = tactic.roles && tactic.roles[i] === 'defender';
        var defaultAuto = defaultAutos[i] || 'shoot3';
        var roleColor = 'var(--text-muted)';
        if (tactic.roles) {
            if (tactic.roles[i] === 'scorer') roleColor = '#22c55e';
            else if (tactic.roles[i] === 'defender') roleColor = '#ef4444';
            else if (tactic.roles[i] === 'feeder') roleColor = '#eab308';
            else if (tactic.roles[i] === 'climber') roleColor = '#a78bfa';
        }

        var tierOpts = '';
        var tKeys = Object.keys(ROBOT_TIERS);
        for (var j = 0; j < tKeys.length; j++) {
            tierOpts += '<option value="' + tKeys[j] + '"' + (tKeys[j] === (tactic.defaultTier || 't4_competitive') ? ' selected' : '') + '>' + ROBOT_TIERS[tKeys[j]].name + '</option>';
        }

        var autoOpts = '';
        var aKeys = Object.keys(AUTO_TIERS);
        for (var k = 0; k < aKeys.length; k++) {
            var at = AUTO_TIERS[aKeys[k]];
            var totalAttempt = at.preloadScored + at.extraPickup;
            var label = at.name;
            if (totalAttempt > 0) label += ' (~' + totalAttempt + ' fuel)';
            autoOpts += '<option value="' + aKeys[k] + '"' + (aKeys[k] === defaultAuto ? ' selected' : '') + '>' + label + '</option>';
        }

        var slot = document.createElement('div');
        slot.className = 'robot-slot';
        slot.innerHTML =
            '<div class="robot-slot__header">' +
            '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + roleColor + ';margin-right:6px;"></span>' +
            'Robot ' + (i + 1) + ' \u2014 <span style="color:' + roleColor + ';font-weight:700;">' + role + '</span>' +
            '</div>' +
            '<div class="robot-slot__grid">' +
            '<div class="form-group"><label>Robot Tier</label><select id="' + color + 'Tier' + i + '">' + tierOpts + '</select></div>' +
            '<div class="form-group"><label>Auto Capability</label><select id="' + color + 'Auto' + i + '">' + autoOpts + '</select></div>' +
            '</div>';
        container.appendChild(slot);
    }
}

// ============================================================
// ALLIANCE BUILDER
// ============================================================
function getAlliance(color, Sim) {
    var tacticKey = $(color + 'Tactic').value;
    var robots = [];
    for (var i = 0; i < 3; i++) {
        robots.push({ tactic: tacticKey, tier: $(color + 'Tier' + i).value, autoTier: $(color + 'Auto' + i).value });
    }
    return Sim.createCustomAlliance(robots, $(color + 'HP').value);
}

// ============================================================
// REALISM TOGGLES
// ============================================================
function bindRealismToggles(Sim) {
    var map = { toggleBreakdown: 'breakdown', toggleBrownout: 'brownout', toggleFouls: 'fouls', toggleCongestion: 'congestion' };
    var ids = Object.keys(map);
    for (var i = 0; i < ids.length; i++) {
        (function (id, key) {
            var el = $(id);
            if (el) el.addEventListener('change', function () { Sim.REALISM[key] = el.checked; });
        })(ids[i], map[ids[i]]);
    }
}

// ============================================================
// CONTROLS
// ============================================================
function bindControls(Sim) {
    var btnSingle = $('btnSingleMatch');
    var btnBatch = $('btnBatchSim');
    var btnOptimal = $('btnOptimal');

    if (btnSingle) {
        btnSingle.addEventListener('click', function () {
            try {
                var red = getAlliance('red', Sim);
                var blue = getAlliance('blue', Sim);
                var result = Sim.runMatch(red, blue);

                // Auto-run batch for statistical context
                var batchRed = getAlliance('red', Sim);
                var batchBlue = getAlliance('blue', Sim);
                var batchResult = Sim.runBatchSimulation(batchRed, batchBlue, 100);

                renderSingleMatch(result, red, blue, batchResult, Sim);
            } catch (e) {
                console.error('Single match error:', e);
                alert('Error: ' + e.message);
            }
        });
    }

    if (btnBatch) {
        btnBatch.addEventListener('click', function () {
            try {
                var red = getAlliance('red', Sim);
                var blue = getAlliance('blue', Sim);
                var n = parseInt($('batchCount').value) || 200;
                btnBatch.disabled = true;
                btnBatch.textContent = 'Running...';
                setTimeout(function () {
                    try {
                        var result = Sim.runBatchSimulation(red, blue, n);
                        renderBatchResult(result, Sim);
                    } catch (e) {
                        console.error('Batch error:', e);
                        alert('Error: ' + e.message);
                    }
                    btnBatch.disabled = false;
                    btnBatch.textContent = '\u{1F4CA} Batch Simulation';
                }, 50);
            } catch (e) { console.error(e); }
        });
    }

    if (btnOptimal) {
        btnOptimal.addEventListener('click', function () {
            btnOptimal.disabled = true;
            btnOptimal.textContent = 'Analyzing...';
            setTimeout(function () {
                try {
                    var tier = $('redTier0').value;
                    var autoTier = $('redAuto0').value;
                    var hpTier = $('redHP').value;
                    var results = Sim.findOptimalTactics(tier, autoTier, hpTier, 80);
                    renderOptimalTactics(results, Sim);
                } catch (e) {
                    console.error('Optimal error:', e);
                    alert('Error: ' + e.message);
                }
                btnOptimal.disabled = false;
                btnOptimal.textContent = '\u{1F3C6} Find Optimal Tactics';
            }, 50);
        });
    }
}

// ============================================================
// RENDER SINGLE MATCH
// ============================================================
function renderSingleMatch(result, redAlliance, blueAlliance, batchResult, Sim) {
    $('resultsEmpty').style.display = 'none';
    $('batchResult').className = 'tab-content';
    $('optimalResult').className = 'tab-content';

    var redWon = result.redScore > result.blueScore;
    var blueWon = result.blueScore > result.redScore;
    var tie = result.redScore === result.blueScore;

    var html =
        '<div class="section-title">Match Result</div>' +
        '<div class="match-result">' +
        '<div class="score-display">' +
        scorePanel('Red', result.redScore, result.red.rp, redWon) +
        '<div class="score-vs">' + (tie ? 'TIE' : 'VS') + '</div>' +
        scorePanel('Blue', result.blueScore, result.blue.rp, blueWon) +
        '</div>' +
        '<div class="breakdown-grid">' +
        breakdownTable('Red', result.red, result.blue.penaltyGiven, redAlliance, Sim) +
        breakdownTable('Blue', result.blue, result.red.penaltyGiven, blueAlliance, Sim) +
        '</div>' +
        '</div>';

    // --- PERFORMANCE CHARTS ---
    html += '<div class="section-title" style="margin-top:32px;">Performance Charts</div>';
    html += '<div class="breakdown-grid">';
    html += buildTimelineChart(result.timeline);
    html += buildPenaltyChart(result);
    html += '</div>';

    // --- PER-ROBOT CONTRIBUTIONS ---
    html += '<div class="section-title" style="margin-top:32px;">Per-Robot Contribution</div>';
    html += '<div class="breakdown-grid">';
    html += buildRobotContribChart('Red', result.red.robotContrib, redAlliance, Sim);
    html += buildRobotContribChart('Blue', result.blue.robotContrib, blueAlliance, Sim);
    html += '</div>';

    // --- STATISTICAL CONTEXT ---
    html += '<div class="section-title" style="margin-top:32px;">Statistical Context (100 matches)</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Average outcome of this exact configuration over 100 auto-simulated matches.</div>';
    html += '<div class="match-result"><div class="batch-grid">';
    html += batchPanel('Red', batchResult.red, batchResult.n);
    html += batchPanel('Blue', batchResult.blue, batchResult.n);
    html += '</div></div>';

    $('singleResult').className = 'tab-content tab-content--active';
    $('singleResult').innerHTML = html;
}

function scorePanel(label, score, rp, isWinner) {
    var c = label.toLowerCase();
    return '<div class="score-panel score-panel--' + c + (isWinner ? ' score-panel--winner' : '') + '">' +
        '<div class="score-panel__label">' + label + ' Alliance</div>' +
        '<div class="score-panel__value">' + score + '</div>' +
        '<div class="rp-total">' + rp.total + ' RP</div>' +
        '<div class="rp-checklist">' +
        rpBadge('Win', rp.win > 0) + rpBadge('Energized', rp.energized > 0) +
        rpBadge('Supercharged', rp.supercharged > 0) + rpBadge('Traversal', rp.traversal > 0) +
        '</div></div>';
}

function rpBadge(label, earned) {
    return '<span class="rp-badge rp-badge--' + (earned ? 'earned' : 'missed') + '">' +
        (earned ? '\u2705' : '\u274C') + ' ' + label + '</span>';
}

function breakdownTable(label, data, penaltyReceived, alliance, Sim) {
    var tactic = Sim.TACTICS[alliance.robots[0].tactic] || {};
    var roleLabels = tactic.roleLabels || ['Robot 1', 'Robot 2', 'Robot 3'];
    var ROBOT_TIERS = Sim.ROBOT_TIERS;

    var robotInfo = '';
    for (var i = 0; i < alliance.robots.length; i++) {
        var r = alliance.robots[i];
        var status = data.statuses[i];
        var statusClass = status === 'full' ? 'full' : status === 'partial' ? 'partial' : 'dead';
        var tierName = ROBOT_TIERS[r.tier] ? ROBOT_TIERS[r.tier].name : r.tier;
        robotInfo += '<tr><td>' + roleLabels[i] + ' (' + tierName + ')</td>' +
            '<td><span class="status-indicator status-indicator--' + statusClass + '">' + status + '</span></td></tr>';
    }

    var climbInfo = '';
    for (var j = 0; j < data.endgame.climbResults.length; j++) {
        var c = data.endgame.climbResults[j];
        climbInfo += '<tr><td>&nbsp;&nbsp;' + roleLabels[j] + '</td><td>' +
            (c.success ? 'L' + c.level + ' (' + c.pts + 'pts)' : '\u274C Failed') + '</td></tr>';
    }

    return '<div class="card">' +
        '<h3 style="margin-bottom:4px;font-size:15px;font-weight:700;">' + label + ' Alliance</h3>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">' + (tactic.icon || '') + ' ' + (tactic.name || '') + '</div>' +
        '<table class="breakdown-table"><tbody>' +
        robotInfo +
        '<tr><td colspan="2" style="height:8px"></td></tr>' +
        '<tr><td>Auto Fuel</td><td>' + data.auto.fuel + '</td></tr>' +
        '<tr><td>Auto Climb</td><td>' + data.auto.climb + ' pts</td></tr>' +
        '<tr><td>Auto HP</td><td>' + data.auto.hp + '</td></tr>' +
        '<tr><td colspan="2" style="height:4px"></td></tr>' +
        '<tr><td>Teleop Fuel (Active)</td><td>' + data.teleop.fuel + '</td></tr>' +
        '<tr><td>Teleop Fuel (Hoarded)</td><td>' + data.teleop.fuelInactive + '</td></tr>' +
        '<tr><td colspan="2" style="height:4px"></td></tr>' +
        '<tr><td>Endgame Fuel</td><td>' + data.endgame.fuel + '</td></tr>' +
        '<tr><td>Endgame HP</td><td>' + data.endgame.hp + '</td></tr>' +
        climbInfo +
        '<tr><td>Climb Total</td><td>' + data.climbTotal + ' pts</td></tr>' +
        '<tr><td colspan="2" style="height:4px"></td></tr>' +
        '<tr><td><strong>Total Fuel Active</strong></td><td><strong>' + data.fuelActive + '</strong></td></tr>' +
        '<tr><td>Penalty Given</td><td>' + data.penaltyGiven + ' pts</td></tr>' +
        '<tr><td>Penalty Received</td><td>+' + penaltyReceived + ' pts</td></tr>' +
        '</tbody></table></div>';
}

// ============================================================
// TIMELINE CHART
// ============================================================
function buildTimelineChart(timeline) {
    if (!timeline || timeline.length === 0) return '';
    var maxScore = 1;
    for (var i = 0; i < timeline.length; i++) {
        if (timeline[i].redCum > maxScore) maxScore = timeline[i].redCum;
        if (timeline[i].blueCum > maxScore) maxScore = timeline[i].blueCum;
    }
    var chartH = 180;
    var bars = '';
    for (var j = 0; j < timeline.length; j++) {
        var t = timeline[j];
        var rH = Math.max(4, Math.floor((t.redCum / maxScore) * chartH));
        var bH = Math.max(4, Math.floor((t.blueCum / maxScore) * chartH));
        var phaseLabel = t.phase.replace(/ *\(.*?\)/g, '').trim();
        bars += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">' +
            '<div style="display:flex;gap:3px;align-items:flex-end;height:' + chartH + 'px;">' +
            '<div style="width:16px;height:' + rH + 'px;background:linear-gradient(180deg,#ef4444,#dc2626);border-radius:4px 4px 0 0;" title="Red: ' + t.redCum + '"></div>' +
            '<div style="width:16px;height:' + bH + 'px;background:linear-gradient(180deg,#3b82f6,#2563eb);border-radius:4px 4px 0 0;" title="Blue: ' + t.blueCum + '"></div>' +
            '</div>' +
            '<div style="font-size:9px;color:var(--text-muted);text-align:center;line-height:1.2;">' + phaseLabel + '</div>' +
            '<div style="font-size:9px;font-family:monospace;">' +
            '<span style="color:#ef4444;">' + t.redCum + '</span>' +
            '<span style="color:var(--text-muted);"> / </span>' +
            '<span style="color:#3b82f6;">' + t.blueCum + '</span>' +
            '</div></div>';
    }
    return '<div class="card">' +
        '<h3 style="margin-bottom:16px;font-size:15px;font-weight:700;">Score Over Time</h3>' +
        '<div style="display:flex;gap:4px;align-items:flex-end;padding:8px 0;">' + bars + '</div>' +
        '<div style="display:flex;gap:16px;justify-content:center;margin-top:12px;font-size:11px;">' +
        '<span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;margin-right:4px;vertical-align:middle;"></span>Red</span>' +
        '<span><span style="display:inline-block;width:10px;height:10px;background:#3b82f6;border-radius:2px;margin-right:4px;vertical-align:middle;"></span>Blue</span>' +
        '</div></div>';
}

// ============================================================
// PENALTY CHART
// ============================================================
function buildPenaltyChart(result) {
    var rMinor = result.red.foulsCommitted.minor;
    var rMajor = result.red.foulsCommitted.major;
    var bMinor = result.blue.foulsCommitted.minor;
    var bMajor = result.blue.foulsCommitted.major;
    var rPen = result.red.penaltyGiven;
    var bPen = result.blue.penaltyGiven;
    var maxPen = Math.max(rPen, bPen, 1);

    var rBarW = Math.max(8, Math.floor((rPen / maxPen) * 100));
    var bBarW = Math.max(8, Math.floor((bPen / maxPen) * 100));

    return '<div class="card">' +
        '<h3 style="margin-bottom:16px;font-size:15px;font-weight:700;">Penalty Breakdown</h3>' +
        '<div style="margin-bottom:16px;">' +
        penaltyBar('Red', '#ef4444', rBarW, rPen, rMinor, rMajor) +
        penaltyBar('Blue', '#3b82f6', bBarW, bPen, bMinor, bMajor) +
        '</div>' +
        '<div style="font-size:10px;color:var(--text-muted);border-top:1px solid var(--border-glass);padding-top:8px;">' +
        'Red fouls give ' + rPen + 'pts to Blue. Blue fouls give ' + bPen + 'pts to Red.' +
        '</div></div>';
}

function penaltyBar(label, color, barW, total, minor, major) {
    return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
        '<span style="width:50px;font-size:12px;font-weight:600;color:' + color + ';">' + label + '</span>' +
        '<div style="flex:1;">' +
        '<div style="width:' + barW + '%;height:24px;background:linear-gradient(90deg,' + color + '33,' + color + '99);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;">' +
        total + ' pts</div>' +
        '<div style="font-size:10px;color:var(--text-muted);margin-top:4px;">' +
        minor + ' minor (' + (minor * 8) + 'pts) + ' + major + ' major (' + (major * 15) + 'pts)</div>' +
        '</div></div>';
}

// ============================================================
// PER-ROBOT CONTRIBUTION CHART
// ============================================================
function buildRobotContribChart(label, contrib, alliance, Sim) {
    if (!contrib) return '';
    var tactic = Sim.TACTICS[alliance.robots[0].tactic] || {};
    var roleLabels = tactic.roleLabels || ['Robot 1', 'Robot 2', 'Robot 3'];
    var ROBOT_TIERS = Sim.ROBOT_TIERS;
    var color = label.toLowerCase();

    var maxTotal = 1;
    for (var i = 0; i < contrib.length; i++) {
        var total = contrib[i].autoFuel + contrib[i].teleopFuel + contrib[i].climbPts;
        if (total > maxTotal) maxTotal = total;
    }

    var rows = '';
    for (var j = 0; j < contrib.length; j++) {
        var c = contrib[j];
        var r = alliance.robots[j];
        var tierName = ROBOT_TIERS[r.tier] ? ROBOT_TIERS[r.tier].name : r.tier;
        var total = c.autoFuel + c.teleopFuel + c.climbPts;
        var autoW = maxTotal > 0 ? Math.floor((c.autoFuel / maxTotal) * 100) : 0;
        var teleopW = maxTotal > 0 ? Math.floor((c.teleopFuel / maxTotal) * 100) : 0;
        var climbW = maxTotal > 0 ? Math.floor((c.climbPts / maxTotal) * 100) : 0;
        var statusIcon = c.status === 'full' ? '\u2705' : c.status === 'partial' ? '\u26A0\uFE0F' : '\u274C';

        rows += '<div style="margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">' +
            '<span>' + statusIcon + ' ' + roleLabels[j] + ' (' + tierName + ')</span>' +
            '<span style="font-family:monospace;font-weight:600;">' + total + ' pts</span>' +
            '</div>' +
            '<div style="display:flex;height:16px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,0.05);">' +
            (autoW > 0 ? '<div style="width:' + autoW + '%;background:rgba(168,85,247,0.6);" title="Auto: ' + c.autoFuel + '"></div>' : '') +
            (teleopW > 0 ? '<div style="width:' + teleopW + '%;background:rgba(' + (color === 'red' ? '239,68,68' : '59,130,246') + ',0.6);" title="Teleop: ' + c.teleopFuel + '"></div>' : '') +
            (climbW > 0 ? '<div style="width:' + climbW + '%;background:rgba(34,197,94,0.6);" title="Climb: ' + c.climbPts + '"></div>' : '') +
            '</div>' +
            '<div style="font-size:9px;color:var(--text-muted);margin-top:2px;">Auto: ' + c.autoFuel + ' \u2022 Teleop: ' + c.teleopFuel + ' \u2022 Climb: ' + c.climbPts + '</div>' +
            '</div>';
    }

    return '<div class="card">' +
        '<h3 style="margin-bottom:12px;font-size:15px;font-weight:700;color:var(--' + color + '-alliance);">' + label + ' Robots</h3>' +
        rows +
        '<div style="display:flex;gap:12px;font-size:10px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-glass);">' +
        '<span><span style="display:inline-block;width:8px;height:8px;background:rgba(168,85,247,0.6);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Auto</span>' +
        '<span><span style="display:inline-block;width:8px;height:8px;background:rgba(' + (color === 'red' ? '239,68,68' : '59,130,246') + ',0.6);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Teleop</span>' +
        '<span><span style="display:inline-block;width:8px;height:8px;background:rgba(34,197,94,0.6);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Climb</span>' +
        '</div></div>';
}

// ============================================================
// RENDER BATCH RESULT
// ============================================================
function renderBatchResult(result, Sim) {
    $('resultsEmpty').style.display = 'none';
    $('singleResult').className = 'tab-content';
    $('optimalResult').className = 'tab-content';
    $('batchResult').className = 'tab-content tab-content--active';
    $('batchResult').innerHTML =
        '<div class="section-title">Batch Simulation (' + result.n + ' matches)</div>' +
        '<div class="match-result"><div class="batch-grid">' +
        batchPanel('Red', result.red, result.n) +
        batchPanel('Blue', result.blue, result.n) +
        '</div></div>';
}

function batchPanel(label, data, n) {
    var color = label.toLowerCase();
    return '<div class="card" style="border-color:var(--' + color + '-border);">' +
        '<h3 style="margin-bottom:16px;font-size:15px;font-weight:700;color:var(--' + color + '-alliance);">' + label + ' Alliance</h3>' +
        batchStat('Avg Score', data.avgScore, false) +
        batchStat('Avg RP/Match', data.avgRP, true) +
        batchStat('Win Rate', data.winRate + '%', false) +
        batchStat('Tie Rate', data.tieRate + '%', false) +
        '<div style="margin:16px 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);">RP Achievement Rates</div>' +
        rpRateBar('Energized (\u2265100 fuel)', data.energizedRate, 'energized') +
        rpRateBar('Supercharged (\u2265360 fuel)', data.superchargedRate, 'supercharged') +
        rpRateBar('Traversal (\u226550 climb pts)', data.traversalRate, 'traversal') +
        '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-glass);">' +
        batchStat('Avg Fuel in Active Hub', data.avgFuelActive, false) +
        batchStat('Avg Climb Pts', data.avgClimbPts, false) +
        batchStat('Avg Penalty Given', data.avgPenalty, false) +
        '</div></div>';
}

function batchStat(label, value, highlight) {
    return '<div class="batch-stat">' +
        '<span class="batch-stat__label">' + label + '</span>' +
        '<span class="batch-stat__value"' + (highlight ? ' style="color:var(--accent);font-size:18px;"' : '') + '>' + value + '</span></div>';
}

function rpRateBar(label, rate, type) {
    return '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">' +
        '<span style="color:var(--text-secondary);">' + label + '</span>' +
        '<span style="font-family:monospace;font-weight:600;">' + rate + '%</span>' +
        '</div>' +
        '<div class="rp-rate-bar"><div class="rp-rate-bar__fill rp-rate-bar__fill--' + type + '" style="width:' + rate + '%"></div></div></div>';
}

// ============================================================
// RENDER OPTIMAL TACTICS HEATMAP
// ============================================================
function renderOptimalTactics(results, Sim) {
    var TACTICS = Sim.TACTICS;
    $('resultsEmpty').style.display = 'none';
    $('singleResult').className = 'tab-content';
    $('batchResult').className = 'tab-content';
    $('optimalResult').className = 'tab-content tab-content--active';

    var tacticKeys = Object.keys(TACTICS);
    var matrix = {};
    for (var ri = 0; ri < results.length; ri++) {
        var r = results[ri];
        if (!matrix[r.redTactic]) matrix[r.redTactic] = {};
        matrix[r.redTactic][r.blueTactic] = {
            rpRed: parseFloat(r.red.avgRP), rpBlue: parseFloat(r.blue.avgRP),
            winRed: r.red.winRate, winBlue: r.blue.winRate,
            scoreRed: r.red.avgScore, scoreBlue: r.blue.avgScore
        };
    }

    var tacticAvgRP = {};
    for (var ti = 0; ti < tacticKeys.length; ti++) {
        var rt = tacticKeys[ti];
        var total = 0;
        for (var tj = 0; tj < tacticKeys.length; tj++) {
            total += (matrix[rt] && matrix[rt][tacticKeys[tj]]) ? matrix[rt][tacticKeys[tj]].rpRed : 0;
        }
        tacticAvgRP[rt] = total / tacticKeys.length;
    }
    var sorted = tacticKeys.slice().sort(function (a, b) { return tacticAvgRP[b] - tacticAvgRP[a]; });

    var html = '<table class="heatmap-table"><thead><tr><th>Red \\ Blue</th>';
    for (var ci = 0; ci < tacticKeys.length; ci++) {
        html += '<th>' + TACTICS[tacticKeys[ci]].icon + '<br>' + TACTICS[tacticKeys[ci]].name.split('/')[0].trim() + '</th>';
    }
    html += '</tr></thead><tbody>';
    for (var si = 0; si < sorted.length; si++) {
        var rtk = sorted[si];
        html += '<tr><td>' + TACTICS[rtk].icon + ' ' + TACTICS[rtk].name + '</td>';
        for (var cj = 0; cj < tacticKeys.length; cj++) {
            var cell = matrix[rtk] && matrix[rtk][tacticKeys[cj]];
            if (cell) {
                var rp = cell.rpRed;
                html += '<td><div class="tooltip"><span class="heatmap-cell" style="background:' + getHeatColor(rp, 0, 5) + '">' + rp.toFixed(1) + '</span>' +
                    '<div class="tooltip__content">Red: ' + cell.scoreRed + 'pts, ' + rp.toFixed(2) + 'RP, ' + cell.winRed + '% win<br>Blue: ' + cell.scoreBlue + 'pts, ' + cell.rpBlue.toFixed(2) + 'RP, ' + cell.winBlue + '% win</div></div></td>';
            } else {
                html += '<td>\u2014</td>';
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table>';

    var rank = '<div style="margin-top:24px;"><div class="section-title">Tactic Rankings (Avg RP vs All Opponents)</div>' +
        '<table class="breakdown-table"><thead><tr><th>Rank</th><th>Tactic</th><th>Avg RP/Match</th></tr></thead><tbody>';
    for (var rk = 0; rk < sorted.length; rk++) {
        rank += '<tr><td>#' + (rk + 1) + '</td><td>' + TACTICS[sorted[rk]].icon + ' ' + TACTICS[sorted[rk]].name + '</td>' +
            '<td style="color:var(--accent);font-weight:700;">' + tacticAvgRP[sorted[rk]].toFixed(2) + '</td></tr>';
    }
    rank += '</tbody></table></div>';

    $('optimalResult').innerHTML =
        '<div class="section-title">Optimal Tactics Heatmap</div>' +
        '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Each cell = <strong>Red avg RP/match</strong>. Hover for details.</p>' +
        '<div class="card"><div class="heatmap-container">' + html + '</div></div>' + rank;
}

function getHeatColor(value, min, max) {
    var t = (value - min) / (max - min);
    if (t < 0.2) return 'rgba(239,68,68,' + (0.15 + t * 2) + ')';
    if (t < 0.4) return 'rgba(245,158,11,' + (0.15 + t) + ')';
    if (t < 0.6) return 'rgba(250,204,21,' + (0.1 + t * 0.5) + ')';
    if (t < 0.8) return 'rgba(34,197,94,' + (0.1 + t * 0.4) + ')';
    return 'rgba(34,197,94,' + (0.3 + t * 0.5) + ')';
}
