import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(file,'utf8');

test('IELTS Academic writing bank follows standard task structure',()=>{
  const context={window:{}};
  vm.runInNewContext(read('web/ielts-academic-bank-v67.js'),context);
  const writing=context.window.BTVIELTSAcademic.bank('writing');
  assert.ok(writing.length>=500);
  for(const item of writing){
    assert.ok([1,2].includes(item.task),`Unexpected task type: ${item.task}`);
    if(item.task===1){
      assert.equal(item.minimumWords,150);
      assert.match(item.prompt,/Summarise the information by selecting and reporting the main features/i);
      assert.ok(item.visual?.labels?.length>=4);
      assert.ok(item.visual?.values?.length>=4);
    }else{
      assert.equal(item.minimumWords,250);
      assert.match(item.prompt,/In your response, support your ideas with relevant reasons and examples\./);
      assert.ok(!item.visual);
    }
  }
});

test('Standalone IELTS writing renderer shows Task 1 bar chart data',()=>{
  const js=read('web/ielts-centre-v103.js');
  assert.match(js,/function writingVisual\(question\)/);
  assert.match(js,/class="questionChart"/);
  assert.match(js,/class="questionBars"/);
  assert.ok(js.includes('<p class="questionPrompt">${esc(question.prompt)}</p>${task1Data}'));
  assert.match(js,/const task1Data=current==='writing'&&question\.task===1\?writingVisual\(question\):''/);
});
