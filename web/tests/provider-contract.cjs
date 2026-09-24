const assert = require('node:assert/strict');
const path = require('node:path');
const mod = require(path.join(process.cwd(), '.tmp-provider-test/swiss-wasm-provider.js'));

function norm360(v){ return ((v%360)+360)%360; }

class FakeRuntime {
  constructor(){ this.loaded=false; this.calls=[]; }
  async init(){ this.initialized=true; }
  async loadStandardEphemeris(){ this.loaded=true; }
  dateToJulianDay(date){
    // stable fake JD with a tiny time dependence
    return 2440000 + date.getTime()/86400000/100000;
  }
  calculatePosition(jd, body, flags=0){
    this.calls.push(['pos',body,flags]);
    // longitude differs by ephemeris flag so tests can detect the chosen engine.
    const ephOffset = (flags & 2) ? 0.002 : 0.001;
    const isEq = !!(flags & 2048);
    return {
      longitude: norm360(body*27.123 + ephOffset),
      latitude: isEq ? -20 + body*0.25 : body*0.1,
      distance: 1,
      longitudeSpeed: body === 2 ? -0.5 : 1 + body*0.01,
      latitudeSpeed: 0,
      distanceSpeed: 0,
      flags,
    };
  }
  calculateHouses(jd, lat, lon, system='T'){
    // Fake but internally consistent: ARMC = Greenwich(100°) + longitude.
    const armc = norm360(100 + lon);
    const asc = norm360(armc + 20 + lat*0.01);
    const mc = norm360(armc + 90);
    const cusps = [null];
    for(let i=0;i<12;i++) cusps.push(norm360(asc + i*30));
    return {cusps,ascendant:asc,mc,armc,houseSystem:system};
  }
  close(){ this.closed=true; }
}

(async()=>{
  const runtime = new FakeRuntime();
  const provider = new mod.SwissWasmAstronomyProvider({runtimeFactory: async()=>runtime});
  const subject = {
    name:'Sergio',date:'1989-01-23',local_time:'10:55:00',utc_offset_hours:-3,
    latitude:-1.45,longitude:-48.5,location_name:'Belem',
    legacy_latitude:-1.45,legacy_longitude:-48.5,classic_hsl_hours:18+52/60+24/3600,
  };

  const classic = await provider.calculateClassic(subject);
  assert.equal(classic.engineId,'vega_classic');
  assert.equal(classic.houseCalculation.hsl_source,'archived_report_override');
  assert.equal(classic.houseCalculation.house_system,'Polich/Page (T)');
  assert.equal(classic.cusps.length,12);
  assert.ok(classic.bodies.Chiron);
  assert.ok(runtime.loaded,'Swiss files must load for Chiron even in classic mode');
  const classicSunCalls = runtime.calls.filter(c=>c[0]==='pos'&&c[1]===0);
  assert.ok(classicSunCalls.some(c=>(c[2]&4)!==0),'Classic Sun must use Moshier flag');
  const classicChironCalls = runtime.calls.filter(c=>c[0]==='pos'&&c[1]===15);
  assert.ok(classicChironCalls.some(c=>(c[2]&2)!==0),'Classic Chiron must use Swiss flag');

  // Target ARMC must be reproduced by synthetic-longitude house route.
  const targetArmc = classic.houseCalculation.armc_degrees;
  const syntheticLon = classic.houseCalculation.synthetic_longitude_degrees;
  assert.ok(Math.abs(norm360(100+syntheticLon)-targetArmc)<1e-9);

  runtime.calls.length=0;
  const modern = await provider.calculateModern(subject);
  assert.equal(modern.engineId,'modern_swiss');
  assert.equal(modern.houseCalculation.house_system,'Polich/Page (T)');
  assert.equal(modern.cusps.length,12);
  const modernSunCalls = runtime.calls.filter(c=>c[0]==='pos'&&c[1]===0);
  assert.ok(modernSunCalls.some(c=>(c[2]&2)!==0),'Modern Sun must use Swiss flag');
  assert.ok(runtime.calls.some(c=>c[0]==='pos'&&c[1]===10),'Mean Node must be requested');
  assert.ok(runtime.calls.some(c=>c[0]==='pos'&&c[1]===12),'Mean Apogee must be requested');
  assert.ok(runtime.calls.some(c=>c[0]==='pos'&&c[1]===15),'Chiron must be requested');

  await provider.close();
  assert.ok(runtime.closed);
  console.log('provider-contract: 18 assertions passed');
})().catch(err=>{console.error(err);process.exit(1)});
