// Standalone documentation/MCP server. Run npm run skill:server to compile first.
const { startSkillServer } = require('../dist-electron/skillServer.js');
const port = Number(process.env.SVB_SKILL_PORT || 8775);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid SVB_SKILL_PORT');
startSkillServer(port);
