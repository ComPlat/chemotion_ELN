const digit= (input, precision) => {
   const output = input || 0.0;
   return output.toFixed(precision)
}

module.exports = { digit };
