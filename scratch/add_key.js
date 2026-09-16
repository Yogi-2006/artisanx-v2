const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, '..', 'frontend', 'src', 'i18n');
const files = fs.readdirSync(i18nDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(i18nDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (data.facilitator && !data.facilitator.activity_log) {
    data.facilitator.activity_log = "Activity Log";
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`Updated ${file}`);
  }
}
