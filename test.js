const { parseInput } = require("./helper");

// Test cases
console.log(
  "case 1",
  parseInput(
    `user@host -p 21 -n note -pass 'pas   sword" -pri /path/to/private/key -keypass 'keypa&&9(((9sss__--ss'`
  )
);

console.log(
  "case 2",
  parseInput(
    "usexxxr@host -p xx21 -n note -keypass keypass -pass       password -pri /path/to/private/key "
  )
);

// Test case with varying spaces and no pathPrivateKey
console.log(
  "case 3",
  parseInput(
    "user@host -p 22 -n 'note with spaces' -pass 'password' -keypass 'keypassword'"
  )
);

// Test case with missing mandatory parameters
console.log("case 4", parseInput("user@host -n note -keypass 'keypassword'"));

// Test case with pathPrivateKey and keyPassword, but no password
console.log(
  "case 5",
  parseInput("user@host -pri /path/to/private/key -keypass 'keypassword'")
);

// Test case with single quotes, double quotes, and escaped characters
console.log(
  "case 6",
  parseInput(
    `user@host -p 22 -n "note with spaces and special chars @#!*" -pass 'password' -pri '/path/to/private/key' -keypass "keypassword"`
  )
);

// Test case with no options at all
console.log("case 7", parseInput("user@host"));

// Test case with leading and trailing spaces
console.log(
  "case 8",
  parseInput(
    "  user@host  -p  22  -n   'note with extra spaces'   -pass   'password'   -pri   '/path/to/private/key'   -keypass   'keypassword'  "
  )
);

// Test case with multiple options having spaces in values
console.log(
  "case 9",
  parseInput(
    "user@host -p 2222 -n 'note with    multiple spaces' -pri '/path with spaces/private/key' -pass 'password with spaces' -keypass 'keypass with spaces'"
  )
);
