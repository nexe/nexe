let pass = false;
try {
  process.dlopen('', '');
} catch(e) {
  // musl error message
  if(e.message === 'Dynamic loading not supported') pass = true;
}

console.log(pass ? 'true' : 'false');
