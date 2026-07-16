const fs = require('fs');
const path = require('path');
const { parse } = require('@vue/compiler-sfc');
const { compile } = require('@vue/compiler-dom');
const { NodeTypes } = require('@vue/compiler-core');

function logIf(node, context) {
  if (node.type === NodeTypes.IF) {
    const branches = node.branches;
    const last = branches[branches.length - 1];
    const missingElse = !!(last && last.condition != null);
    const line = node.loc && node.loc.start ? node.loc.start.line : '?';
    if (missingElse) {
      console.log(`>>> MISSING ELSE: ${file} line=${line} branches=${branches.length}`);
      branches.forEach((b,i) => console.log(`     branch[${i}] ${b.condition?'v-if/else-if':'v-else'} line=${b.loc&&b.loc.start?b.loc.start.line:'?'}`));
    }
  }
}

const dir = 'src/views';
let file = '';
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.vue')) continue;
  file = f;
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  try {
    const { descriptor } = parse(content, { filename: f });
    compile(descriptor.template.content, { prefixIdentifiers: true, nodeTransforms: [logIf], onError(){} });
  } catch (e) {
    if (!String(e.message).includes('reading')) console.log(`[compile-err] ${f}: ${e.message}`);
  }
}
