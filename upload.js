const fs = require('fs');
const multer = require('multer');
const uploadDirectory = "./public/img";


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/img/');
    },
    filename: (req, file, cb) => {
        fs.readdir(uploadDirectory, (err, files) => {
            cb(null, files.length-1 + ".png");
          });
    }
});

const upload = multer({storage: storage});

module.exports = upload;