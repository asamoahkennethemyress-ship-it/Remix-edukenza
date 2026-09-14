/**
 * Converts a number to its English word representation for official financial receipts.
 * e.g. 1500.50 -> "One Thousand Five Hundred Ghana Cedis and Fifty Pesewas Only"
 */
export function numberToWords(amount: number, currencyName = 'Ghana Cedis', subunitName = 'Pesewas'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `Zero ${currencyName} Only`;
  }

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertHundreds(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
      if (n > 0) str += 'and ';
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return `Zero ${currencyName} Only`;
  }

  let words = '';
  let temp = integerPart;

  if (temp >= 1000000000) {
    const billions = Math.floor(temp / 1000000000);
    words += convertHundreds(billions) + ' Billion ';
    temp %= 1000000000;
  }

  if (temp >= 1000000) {
    const millions = Math.floor(temp / 1000000);
    words += convertHundreds(millions) + ' Million ';
    temp %= 1000000;
  }

  if (temp >= 1000) {
    const thousands = Math.floor(temp / 1000);
    words += convertHundreds(thousands) + ' Thousand ';
    temp %= 1000;
  }

  if (temp > 0) {
    words += convertHundreds(temp) + ' ';
  }

  words = words.trim();
  let result = words ? `${words} ${currencyName}` : '';

  if (decimalPart > 0) {
    const decimalWords = convertHundreds(decimalPart);
    result += ` and ${decimalWords} ${subunitName}`;
  }

  return `${result} Only`.trim();
}
