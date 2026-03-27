#!/usr/bin/env node
/**
 * SEAMS Recommendation API - Load Test Script
 * Phases: Warm-up 20c/15s, Sustained 100c/30s, Burst 200c/15s
 */

const autocannon = require('autocannon');
const { promisify } = require('util');
const fs = require('fs');
const fire = promisify(autocannon);

const BASE_URL   = process.env.SEAMS_URL   || 'http://localhost:5000';
const AUTH_TOKEN = process.env.AUTH_TOKEN  || 'REPLACE_WITH_VALID_JWT';
const TARGET     = `${BASE_URL}/api/events/recommended?page=1&limit=10`;
const JSON_OUT   = __dirname + '/load_test_results.json';

const REQUEST_OPTS = {
    url: TARGET,
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
    },
};

const extract = (r) => ({
    requests_per_sec_avg:  r.requests.average,
    requests_per_sec_peak: r.requests.max,
    total_requests:        r.requests.total,
    latency_avg_ms:        r.latency.mean,
    latency_p50_ms:        r.latency.p50,
    latency_p95_ms:        r.latency.p95,
    latency_p99_ms:        r.latency.p99,
    latency_max_ms:        r.latency.max,
    errors:                r.errors,
    timeouts:              r.timeouts,
    non2xx:                r.non2xx,
    failure_pct:           ((r.errors / Math.max(r.requests.total, 1)) * 100).toFixed(2),
});

const printPhase = (name, r) => {
    const p = r.latency, req = r.requests;
    console.log('\n' + '='.repeat(60));
    console.log(`  PHASE: ${name}`);
    console.log('='.repeat(60));
    console.log(`  Requests/sec : ${req.average.toFixed(1)} avg  |  ${req.max} peak`);
    console.log(`  Total        : ${req.total}`);
    console.log(`  Latency avg  : ${p.mean.toFixed(1)} ms`);
    console.log(`  P50          : ${p.p50} ms`);
    console.log(`  P95          : ${p.p95} ms`);
    console.log(`  P99          : ${p.p99} ms`);
    console.log(`  Max          : ${p.max} ms`);
    console.log(`  Errors       : ${r.errors}   Timeouts: ${r.timeouts}   Non-2xx: ${r.non2xx}`);
    console.log('='.repeat(60));
};

const runPhase = async (name, connections, duration) => {
    console.log(`\n[LOAD TEST] ${name}: ${connections} connections / ${duration}s`);
    const result = await fire({ ...REQUEST_OPTS, connections, duration, pipelining: 1, title: name });
    printPhase(name, result);
    return result;
};

const main = async () => {
    if (AUTH_TOKEN === 'REPLACE_WITH_VALID_JWT') {
        console.error('[ERROR] Set AUTH_TOKEN env var first.');
        process.exit(1);
    }

    console.log('[LOAD TEST] SEAMS Recommendation API - Post-Optimization Run');
    console.log(`[LOAD TEST] Target: ${TARGET}`);

    const p1 = await runPhase('Phase 1 - Warm-up (Cache Prime)', 20,  15);
    await new Promise(r => setTimeout(r, 2000));
    const p2 = await runPhase('Phase 2 - Sustained Load',        100, 30);
    await new Promise(r => setTimeout(r, 2000));
    const p3 = await runPhase('Phase 3 - Burst Stress',          200, 15);

    const totalReqs   = p1.requests.total + p2.requests.total + p3.requests.total;
    const totalErrors = p1.errors + p2.errors + p3.errors;
    const totalTOs    = p1.timeouts + p2.timeouts + p3.timeouts;
    const avgLat      = ((p1.latency.mean + p2.latency.mean + p3.latency.mean) / 3).toFixed(1);
    const worstP95    = Math.max(p1.latency.p95 || 0, p2.latency.p95 || 0, p3.latency.p95 || 0);

    const summary = {
        overall_avg_latency_ms:   avgLat,
        worst_p95_ms:             worstP95,
        total_requests:           totalReqs,
        total_errors:             totalErrors,
        failure_pct:              ((totalErrors / Math.max(totalReqs, 1)) * 100).toFixed(2),
        total_timeouts:           totalTOs,
        latency_200ms_target_met: worstP95 <= 200,
    };

    const out = { phase1: extract(p1), phase2: extract(p2), phase3: extract(p3), summary };
    fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 2), 'utf8');

    console.log('\n' + '#'.repeat(60));
    console.log('#  FINAL SUMMARY');
    console.log('#'.repeat(60));
    console.log(`  Avg latency     : ${avgLat} ms`);
    console.log(`  Worst P95       : ${worstP95} ms  ${worstP95 <= 200 ? '[OK - UNDER 200ms TARGET]' : '[FAIL - ABOVE 200ms TARGET]'}`);
    console.log(`  Total errors    : ${totalErrors} / ${totalReqs} (${summary.failure_pct}%)`);
    console.log(`  Total timeouts  : ${totalTOs}`);
    console.log(`  Results JSON    : ${JSON_OUT}`);
    console.log('#'.repeat(60) + '\n');
};

main().catch(err => { console.error('[FATAL]', err.message); process.exit(1); });
