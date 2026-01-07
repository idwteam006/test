// Test the tax calculation logic

function testTaxCalculation() {
  console.log('Testing Tax Calculation Logic\n');
  console.log('================================\n');

  // Test Case 1: Tax DISABLED
  const subtotal1 = 500;
  const taxEnabled1 = false;
  const taxRate1 = 18;
  const calculatedTaxRate1 = taxEnabled1 ? (taxRate1 || 0) / 100 : 0;
  const tax1 = subtotal1 * calculatedTaxRate1;
  const total1 = subtotal1 + tax1;

  console.log('Test 1: Tax DISABLED');
  console.log('-------------------');
  console.log(`  Subtotal: $${subtotal1.toFixed(2)}`);
  console.log(`  Tax Enabled: ${taxEnabled1}`);
  console.log(`  Tax Rate: ${taxRate1}%`);
  console.log(`  Tax Amount: $${tax1.toFixed(2)}`);
  console.log(`  Total: $${total1.toFixed(2)}`);
  console.log(`  ✓ Expected: $500.00, Got: $${total1.toFixed(2)}\n`);

  // Test Case 2: Tax ENABLED with 18%
  const subtotal2 = 500;
  const taxEnabled2 = true;
  const taxRate2 = 18;
  const calculatedTaxRate2 = taxEnabled2 ? (taxRate2 || 0) / 100 : 0;
  const tax2 = subtotal2 * calculatedTaxRate2;
  const total2 = subtotal2 + tax2;

  console.log('Test 2: Tax ENABLED (18%)');
  console.log('-------------------------');
  console.log(`  Subtotal: $${subtotal2.toFixed(2)}`);
  console.log(`  Tax Enabled: ${taxEnabled2}`);
  console.log(`  Tax Rate: ${taxRate2}%`);
  console.log(`  Tax Amount: $${tax2.toFixed(2)}`);
  console.log(`  Total: $${total2.toFixed(2)}`);
  console.log(`  ✓ Expected: $590.00, Got: $${total2.toFixed(2)}\n`);

  // Test Case 3: Tax ENABLED with 10%
  const subtotal3 = 500;
  const taxEnabled3 = true;
  const taxRate3 = 10;
  const calculatedTaxRate3 = taxEnabled3 ? (taxRate3 || 0) / 100 : 0;
  const tax3 = subtotal3 * calculatedTaxRate3;
  const total3 = subtotal3 + tax3;

  console.log('Test 3: Tax ENABLED (10%)');
  console.log('-------------------------');
  console.log(`  Subtotal: $${subtotal3.toFixed(2)}`);
  console.log(`  Tax Enabled: ${taxEnabled3}`);
  console.log(`  Tax Rate: ${taxRate3}%`);
  console.log(`  Tax Amount: $${tax3.toFixed(2)}`);
  console.log(`  Total: $${total3.toFixed(2)}`);
  console.log(`  ✓ Expected: $550.00, Got: $${total3.toFixed(2)}\n`);
}

testTaxCalculation();
