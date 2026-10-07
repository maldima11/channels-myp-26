/**
 * NUST Maize Yield USSD Telephony Simulator & Test Suite
 * 
 * Simulates mobile network operator (MNO) USSD session hops (e.g. Econet/NetOne/Africa's Talking)
 * Supports:
 *   1. Automated end-to-end regression test suite
 *   2. Interactive terminal feature phone dialer (`node simulator.js -i`)
 *   3. GSM 7-bit 160-character length compliance validation
 */

const readline = require('readline');
const { processUssdRequest, UMZINGWANE_WARDS } = require('./server');

const BORDER = "----------------------------------------------------";

/**
 * Validates that a USSD response strictly conforms to telecom constraints:
 * - Begins with CON or END
 * - Does not exceed 160 characters (GSM standard)
 */
function validateUssdResponse(response, testName) {
  const isCon = response.startsWith("CON ");
  const isEnd = response.startsWith("END ");
  const len = response.length;

  if (!isCon && !isEnd) {
    throw new Error(`[FAIL] ${testName}: Response must start with CON or END. Got: "${response.substring(0, 15)}"`);
  }
  if (len > 160) {
    throw new Error(`[FAIL] ${testName}: Exceeded 160 GSM character limit! Length was ${len} chars:\n${response}`);
  }
  return true;
}

/**
 * Automated test suite
 */
async function runAutomatedTests() {
  console.log("\nRunning USSD Automated Regression & Validation Suite...\n" + BORDER);

  let passed = 0;
  let total = 0;

  async function testStep(name, text, expectedPrefix, maxLen = 160) {
    total++;
    process.stdout.write(`• Test ${total}: ${name.padEnd(42)} `);
    const resp = await processUssdRequest("session_test", "*384*20#", "+263771234567", text);
    validateUssdResponse(resp, name);

    if (!resp.startsWith(expectedPrefix)) {
      console.log(`FAIL\n  Expected prefix '${expectedPrefix}', got:\n  ${resp}`);
      return false;
    }

    console.log(`PASS (${resp.length} chars)`);
    passed++;
    return true;
  }

  // --- Suite 1: Screen 0 Language Selection ---
  await testStep("Initial Dial (*384*20#)", "", "CON ");

  // --- Suite 2: English Navigation Flow ---
  await testStep("English: Ward prompt", "1", "CON ");
  await testStep("English: Ward 15 (Esigodini) selected", "1*15", "CON ");
  await testStep("English: Cultivar SC529 selected", "1*15*3", "CON ");
  await testStep("English: Normal rain -> Final Advisory", "1*15*3*2", "END ");

  // --- Suite 3: isiNdebele Navigation Flow ---
  await testStep("isiNdebele: Ward prompt", "2", "CON ");
  await testStep("isiNdebele: Ward 6 (Mawabeni) selected", "2*6", "CON ");
  await testStep("isiNdebele: Cultivar SC301 selected", "2*6*1", "CON ");
  await testStep("isiNdebele: Drought rain -> Final Advisory", "2*6*1*1", "END ");

  // --- Suite 4: Ward 1 (Nswazi North) SC719 Wet Season ---
  await testStep("isiNdebele: Ward 1 SC719 High Rain", "2*1*4*3", "END ");

  // --- Suite 5: Error Recovery ---
  await testStep("Invalid Language Selection ('9')", "9", "CON ");
  await testStep("Invalid Ward Number ('25')", "1*25", "CON ");
  await testStep("Invalid Cultivar Choice ('7')", "1*15*7", "CON ");
  await testStep("Invalid Rain Choice ('5')", "1*15*3*5", "CON ");

  // --- Suite 6: All 20 Wards Length Verification ---
  console.log("\nVerifying GSM 160-char ceiling for all 20 Umzingwane Wards (English & isiNdebele)...");
  for (let w = 1; w <= 20; w++) {
    // English drought SC301
    const respEn = await processUssdRequest("sess_w", "*384*20#", "+26377111222", `1*${w}*1*1`);
    validateUssdResponse(respEn, `Ward ${w} EN Drought`);

    // isiNdebele normal SC529
    const respNd = await processUssdRequest("sess_w", "*384*20#", "+26377111222", `2*${w}*3*2`);
    validateUssdResponse(respNd, `Ward ${w} ND Normal`);
  }
  console.log(`Verified all 20 Wards across both languages (40 scenarios). All within <= 160 chars.`);

  console.log(BORDER);
  console.log(`TEST SUMMARY: ${passed}/${total} test cases passed successfully! All screens 100% GSM compliant.\n`);
}

/**
 * Interactive Feature Phone CLI Dial Simulator
 */
async function runInteractiveSimulator() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\n========================================================");
  console.log("FEATURE PHONE USSD SIMULATOR (Umzingwane District)");
  console.log("Simulating: Nokia 105 / Itel 2160 on Econet/NetOne GSM");
  console.log("Dial code:  *384*20#");
  console.log("Type 'quit' or 'exit' at any time to leave simulator.");
  console.log("========================================================\n");

  let sessionTokens = [];
  const sessionId = `cli_${Date.now()}`;
  const phone = "+263772123456";

  async function renderScreen() {
    const text = sessionTokens.join('*');
    const response = await processUssdRequest(sessionId, "*384*20#", phone, text);

    const isCon = response.startsWith("CON ");
    const isEnd = response.startsWith("END ");
    const screenBody = response.replace(/^(CON|END)\s+/, '');

    console.log("\n+------------------------------------------------------+");
    console.log(`| [SCREEN] ${isEnd ? "SESSION ENDED (END)" : "AWAITING INPUT (CON)"} [${response.length}/160 chars]`);
    console.log("+------------------------------------------------------+");
    console.log(screenBody);
    console.log("+------------------------------------------------------+");

    if (isEnd) {
      console.log(`[SMS Delivery] Advisory dispatched to ${phone}\n`);
      rl.close();
      return;
    }

    rl.question("\nEnter Keypad Input: ", (input) => {
      const clean = input.trim();
      if (clean.toLowerCase() === 'quit' || clean.toLowerCase() === 'exit') {
        console.log("Simulator closed.");
        rl.close();
        return;
      }
      if (clean) {
        sessionTokens.push(clean);
      }
      renderScreen();
    });
  }

  renderScreen();
}

// Command-line dispatch
if (process.argv.includes('-i') || process.argv.includes('--interactive')) {
  runInteractiveSimulator();
} else {
  runAutomatedTests();
}
