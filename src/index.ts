import path from "path";
import moment from "moment";
import lzma from "lzma-native";
import fs from "fs-extra";
import klawSync from "klaw-sync";
import tar from "tar";


// Setup path.
const workPath = path.join(path.resolve(__dirname), "../var");
const backupPath = path.join(workPath, "./.backup");
fs.ensureDirSync(workPath);
fs.ensureDirSync(backupPath);

// Test backup.
// Backup filename pattern is like "autobackup-2020.02.25-02.18.38-UTC.tar.xz".
const backupFiles = klawSync(backupPath, { nodir:  true, filter: (item) => {
    const basename = path.basename(item.path);
    const regex = /^autobackup-\d{4}.\d{2}.\d{2}-\d{2}.\d{2}.\d{2}-UTC.tar.xz$/;
    return regex.test(basename);
} }).slice();

// Append random text to file to simulate file changes.
const randomFilePath = path.join(workPath, `${Math.floor(10 * Math.random()).toString()}.txt`);
fs.writeFileSync(randomFilePath, `${Math.random().toString()}\n`, { flag: "a" });

// Remove old backup file.
backupFiles.sort((a, b) => {
    return a.stats.ctimeMs - b.stats.ctimeMs;
});
while (backupFiles.length > 7) {
    const backupToRemove = backupFiles.shift();
    fs.removeSync(backupToRemove.path);
}

// Backup all file.
const format = "YYYY.MM.DD-HH.mm.ss-z";  // eg. '2020.02.25-01.34.22-UTC'
const today = moment().utc().format(format);
const backupFilePath = path.join(backupPath, `./autobackup-${today}.tar.xz`);
const workFiles = klawSync(workPath, { filter: (item) => {
    return !path.basename(item.path).startsWith(".");
} });
const compressor = lzma.createCompressor();
const tarbar = tar.create({ cwd: workPath, sync: true }, workFiles.map(item => path.basename(item.path))) as unknown as fs.ReadStream;
const output = fs.createWriteStream(backupFilePath);
tarbar.pipe(compressor).pipe(output);
