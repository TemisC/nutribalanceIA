const bcrypt = require('bcryptjs');

const password = 'LCcp1895**//';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('HASHED_PASSWORD:', hash);
});
