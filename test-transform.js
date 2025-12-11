// Test rapide du transformEngine
const { evaluateExpression } = require('./electron/utils/transformEngine');

console.log('=== TEST TRANSFORMATION ENGINE ===\n');

// Test 1: AGE avec date française
const testData1 = {
  dateNaissance: '10/12/2001'
};

try {
  const result1 = evaluateExpression('AGE({dateNaissance})', testData1);
  console.log('✅ Test 1 - AGE({dateNaissance})');
  console.log('   Input: dateNaissance = "10/12/2001"');
  console.log('   Result:', result1);
  console.log('   Expected: ~24 (en 2025)\n');
} catch (error) {
  console.log('❌ Test 1 FAILED:', error.message, '\n');
}

// Test 2: Calcul simple
const testData2 = {
  prix_ht: 100
};

try {
  const result2 = evaluateExpression('{prix_ht} * 1.20', testData2);
  console.log('✅ Test 2 - {prix_ht} * 1.20');
  console.log('   Input: prix_ht = 100');
  console.log('   Result:', result2);
  console.log('   Expected: 120\n');
} catch (error) {
  console.log('❌ Test 2 FAILED:', error.message, '\n');
}

// Test 3: UPPER avec texte
const testData3 = {
  nom: 'Dupont'
};

try {
  const result3 = evaluateExpression('UPPER({nom})', testData3);
  console.log('✅ Test 3 - UPPER({nom})');
  console.log('   Input: nom = "Dupont"');
  console.log('   Result:', result3);
  console.log('   Expected: "DUPONT"\n');
} catch (error) {
  console.log('❌ Test 3 FAILED:', error.message, '\n');
}

// Test 4: CONCAT
const testData4 = {
  prenom: 'Jean',
  nom: 'Dupont'
};

try {
  const result4 = evaluateExpression('CONCAT({prenom}, " ", {nom})', testData4);
  console.log('✅ Test 4 - CONCAT({prenom}, " ", {nom})');
  console.log('   Input: prenom = "Jean", nom = "Dupont"');
  console.log('   Result:', result4);
  console.log('   Expected: "Jean Dupont"\n');
} catch (error) {
  console.log('❌ Test 4 FAILED:', error.message, '\n');
}

// Test 5: IF condition
const testData5 = {
  age: 25
};

try {
  const result5 = evaluateExpression('IF({age} >= 18, "Majeur", "Mineur")', testData5);
  console.log('✅ Test 5 - IF({age} >= 18, "Majeur", "Mineur")');
  console.log('   Input: age = 25');
  console.log('   Result:', result5);
  console.log('   Expected: "Majeur"\n');
} catch (error) {
  console.log('❌ Test 5 FAILED:', error.message, '\n');
}

console.log('=== FIN DES TESTS ===');
