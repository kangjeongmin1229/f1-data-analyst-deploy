// Guide step 4: one copyable prompt per AI. Pasted into a new chat, it connects Kongboda where the AI
// can, walks the user through the clicks only they can make (adding the connector, Google approval),
// briefs once and books an hourly scheduled briefing. The prompt text stays hidden on the page; the
// connector cannot start a chat, so the scheduled task is what makes briefings arrive unasked.
// The MCP address is shown only to signed-in accounts (see install()); otherwise the prompts point to step 3.
const URL_MCP='https://kongboda-motorsports.vercel.app/mcp',NO_URL_KO='꽁보다 가이드 3단계에서 복사한 연결 주소',NO_URL_EN='the connection address from step 3 of the Kongboda guide';
const TASK_KO='“Kongboda Motorsports 커넥터의 kongboda_live_briefing 도구로 F1 상황을 확인해. 세션이 진행 중이면 순위, 타이어, 날씨, 레이스 컨트롤 핵심을 한국어로 짧게 정리해. 진행 중인 세션이 없으면 다음 세션 이름과 한국 시간 시작 시각만 한 줄로 알려 줘.”';
const TASK_EN='"Use the kongboda_live_briefing tool of the Kongboda Motorsports connector to check F1. If a session is live, summarise the order, tyres, weather and race control briefly in English. If no session is live, reply with one line: the next session and its start time in my time zone."';
const WEC_TASK_KO='“Kongboda Motorsports 커넥터의 wec_live_status 도구로 다음 WEC 세션(next_session)을 확인해. 세션이 진행 중이거나 1시간 안에 시작하면, 네가 쓰는 브라우저에서 https://plus.fiawec.com 을 열고 NEXT SESSIONS의 해당 세션 카드 → LIVE TIMING을 눌러 라이브타이밍 표를 읽어. 클래스별(하이퍼카·LMGT3) 선두, 간격, 최근 랩 핵심을 한국어로 짧게 정리해. 시작 전이면 시작 시각만 알려 줘. 로그인 화면이 나오면 아무것도 입력하지 말고 “FIAWEC+에 다시 한 번 로그인해 주세요”라고만 알려 줘. 가까운 세션이 없으면 다음 세션 이름과 한국 시간 시작 시각만 한 줄로 알려 줘.”';
const WEC_TASK_EN='"Use the wec_live_status tool of the Kongboda Motorsports connector to check the next WEC session (next_session). If a session is live or starts within an hour, open https://plus.fiawec.com in your browser, open that session\'s card under NEXT SESSIONS and click LIVE TIMING, then read the timing table. Summarise the class leaders (Hypercar, LMGT3), gaps and key recent laps briefly in English. Before the start, just give the start time. If a login screen appears, type nothing and only tell me: "Please sign in to FIAWEC+ once more." If no session is near, reply with one line: the next session and its start time in my time zone."';
const WEC_LINK_TASK_KO='“Kongboda Motorsports 커넥터의 wec_live_status 도구로 다음 WEC 세션(next_session)을 확인해. 세션이 진행 중이거나 1시간 안에 시작하면 “FIAWEC+ 라이브타이밍 링크(https://plus.fiawec.com/en/livestream/s-…)를 이 대화에 붙여 넣어 주세요”라고 세션 이름·시작 시각과 함께 알려 줘. 아니면 다음 세션 이름과 한국 시간 시작 시각만 한 줄로 알려 줘.”';
const WEC_LINK_TASK_EN='"Use the wec_live_status tool of the Kongboda Motorsports connector to check the next WEC session (next_session). If a session is live or starts within an hour, tell me its name and start time and ask me to paste the FIAWEC+ live timing link (https://plus.fiawec.com/en/livestream/s-…) into this chat. Otherwise reply with one line: the next session and its start time in my time zone."';
const PICK_KO=`3. 실시간으로 받을 종목을 물어봐 줘: ‘F1’, ‘WEC’ 중 하나 또는 둘 다(중복 선택 가능). 내 답을 받은 뒤 다음 단계로 가.
4. F1을 골랐으면 kongboda_live_briefing 도구로 지금 브리핑을 한 번 해 줘. F1 계정 연결이 필요하다고 나오면 https://kongboda-motorsports.vercel.app/live 에서 연결하라고 알려 줘.
5. WEC를 골랐으면 WEC 라이브타이밍은 FIAWEC+ 계정으로만 볼 수 있다고 한 줄로 알려 주고, 두 방식 중 하나를 고르게 해 줘.
- A. 자동 접속(추천): 네가 쓰는 브라우저에서 https://plus.fiawec.com 에 내가 FIAWEC+ 계정으로 처음 한 번만 직접 로그인한다. 로그인은 그 브라우저에 저장되고, 이후 세션마다 네가 라이브타이밍을 열어 브리핑한다.
- B. 링크 붙여넣기: 세션이 시작되면 내가 FIAWEC+ 라이브타이밍 링크(https://plus.fiawec.com/en/livestream/s-…)를 이 대화에 붙여 넣고, 네가 그 페이지를 열어 브리핑한다.
A를 고르면 브라우저에서 https://plus.fiawec.com 을 열어 주고 내가 로그인할 때까지 기다려. 비밀번호와 인증 코드는 절대 네가 입력하지 말고, 로그인 정보를 대화에 적으라고 하지도 마. 로그인이 확인되면 지금 열려 있는 WEC 세션이 있을 때 한 번 브리핑해 줘.
두 방식 모두 네가 브라우저를 조작할 수 있어야 해(예: Claude in Chrome, ChatGPT 에이전트 모드). 지금 브라우저를 쓸 수 없으면 그 사실과 켜는 방법을 짧게 알려 줘. 브라우저에 로그인이 저장되지 않는 환경이면 세션마다 다시 로그인해야 할 수 있다고도 알려 줘.`;
const PICK_EN=`3. Ask me which series I want live: F1, WEC, or both (I can pick more than one). Wait for my answer before the next step.
4. If I picked F1, give me one briefing now with the kongboda_live_briefing tool. If it says an F1 account is needed, tell me to connect it at https://kongboda-motorsports.vercel.app/live.
5. If I picked WEC, tell me in one line that WEC live timing needs a FIAWEC+ account, and let me choose one of two ways.
- A. Auto-connect (recommended): in the browser you use, I sign in to https://plus.fiawec.com with my FIAWEC+ account myself, only the first time. The login stays saved in that browser, and for each session you open live timing and brief me.
- B. Paste the link: when a session starts, I paste the FIAWEC+ live timing link (https://plus.fiawec.com/en/livestream/s-…) into this chat and you open that page and brief me.
If I choose A, open https://plus.fiawec.com in the browser and wait until I have signed in. Never type my password or a verification code yourself, and never ask me to write login details in the chat. Once the login is confirmed, brief me once if a WEC session is open now.
Both ways need you to control a browser (for example Claude in Chrome or ChatGPT agent mode). If you cannot use a browser now, tell me so and briefly how to turn it on. If the browser does not keep logins, tell me I may have to sign in again for each session.`;
const SCHEDULE_KO=`6. 고른 종목만 매시간 실행되는 예약 작업으로 하나씩 만들어 줘. F1: ‘꽁보다 F1 실시간 브리핑’, 작업 지침: ${TASK_KO} WEC A(자동 접속): ‘꽁보다 WEC 실시간 브리핑’, 작업 지침: ${WEC_TASK_KO} WEC B(링크 붙여넣기): ‘꽁보다 WEC 세션 알림’, 작업 지침: ${WEC_LINK_TASK_KO}`;
const SCHEDULE_EN=`6. Create an hourly scheduled task only for each series I picked. F1: "Kongboda F1 live briefing" with these instructions: ${TASK_EN} WEC with A (auto-connect): "Kongboda WEC live briefing" with these instructions: ${WEC_TASK_EN} WEC with B (paste the link): "Kongboda WEC session reminder" with these instructions: ${WEC_LINK_TASK_EN}`;
const LATER_KO='8. 끝나면 짧게 정리해 줘: 만든 예약 작업 목록, 고르지 않은 종목도 언제든 ‘WEC 예약도 만들어 줘’처럼 말하면 추가할 수 있다는 것, WEC 방식은 ‘WEC 링크 방식으로 바꿔 줘’처럼 언제든 바꿀 수 있다는 것, FIAWEC+ 로그인이 풀리면 한 번만 다시 로그인하면 된다는 것, 세션 중 더 자주 보고 싶으면 그 대화에서 ‘업데이트’라고 보내면 된다는 것.';
const LATER_EN='8. When done, give me a short summary: the scheduled tasks you created; that I can add a series I did not pick at any time by saying, for example, "set up WEC too"; that I can switch the WEC way at any time, for example "switch WEC to the link way"; that if the FIAWEC+ login expires I just sign in once more; and that I can send "update" in that chat for more frequent updates during a session.';
const ko=url=>({
 claude:`꽁보다 모터스포츠(Kongboda Motorsports) 연결과 실시간 자동 브리핑(F1·WEC) 설정을 끝까지 도와줘. 네가 할 수 있는 건 직접 하고, 내가 눌러야 하는 단계는 한 번에 하나씩 짧게 알려 줘.
1. 이 대화에서 Kongboda Motorsports 커넥터를 쓸 수 있는지 확인해 줘. 쓸 수 있으면 3번으로 가.
2. 없으면 커넥터 추가는 내가 직접 해야 하니 이 순서로 안내하고 여기서 멈춰 줘.
- claude.ai 웹이나 데스크톱 앱에서 ‘사용자 지정 → 커넥터’(https://claude.ai/customize/connectors)를 연다.
- ‘+ 추가 → 커스텀 커넥터 추가’를 누르고 아래처럼 넣은 뒤 ‘계속’을 누른다. 이름: Kongboda Motorsports, MCP 서버 URL: ${url}
- 인증은 ‘지금 로그인’, OAuth 클라이언트는 ‘자동으로 등록’을 고른다(‘로그인 없음’이 선택돼 있으면 바꾼다). 요청 헤더는 비우고 ‘추가’를 누른다.
- ‘연결’을 누르고 꽁보다에 로그인한 Google 계정으로 ‘연결 승인’을 누른다.
- 새 대화의 ‘+ → 커넥터’에서 Kongboda Motorsports를 켜고 이 문장을 다시 보낸다.
- Team·Enterprise 요금제는 조직 소유자가 먼저 커스텀 커넥터를 허용해야 할 수 있다.
${PICK_KO}
${SCHEDULE_KO}
7. 예약 작업을 만들 수 없으면 이유와 함께, 왼쪽 메뉴 ‘Scheduled’에서 위 지침으로 직접 만드는 방법을 알려 줘. 예약 작업은 Pro·Max·Team·Enterprise 요금제에서 쓸 수 있어.
${LATER_KO}`,
 chatgpt:`꽁보다 모터스포츠(Kongboda Motorsports) 연결과 실시간 자동 브리핑(F1·WEC) 설정을 끝까지 도와줘. 네가 할 수 있는 건 직접 하고, 내가 눌러야 하는 단계는 한 번에 하나씩 짧게 알려 줘.
1. 이 대화에서 Kongboda Motorsports 앱을 쓸 수 있는지 확인해 줘. 쓸 수 있으면 3번으로 가.
2. 없으면 플러그인 설치는 내가 직접 해야 하니 이 순서로 안내하고 여기서 멈춰 줘.
- chatgpt.com 웹에서 ‘플러그인’(https://chatgpt.com/plugins)을 열고 ‘사용자 지정 MCP 서버 추가’를 누른다.
- 아래처럼 넣는다. 이름: Kongboda Motorsports, 서버 URL: ${url}
- 인증은 ‘OAuth’를 고르고 ‘고급 OAuth 설정’은 그대로 둔 채 ‘만들기’를 누른 뒤 Google 계정으로 승인한다.
- 새 대화에서 ‘+’ 메뉴나 ‘@’로 Kongboda Motorsports를 고르고 이 문장을 다시 보낸다.
- 도구가 안 보이면 플러그인 → Kongboda Motorsports → ‘관리’에서 ‘도구 새로고침’을 누르고, ‘권한’을 ‘읽기 전용 도구 허용’으로 바꾼다.
- Business·Enterprise·Edu 워크스페이스는 관리자가 먼저 허용해야 할 수 있다.
${PICK_KO}
${SCHEDULE_KO}
7. 요금제 때문에 매시간 예약이 안 되거나(무료 요금제는 하루 1번까지) 예약 작업에서 이 앱을 쓸 수 없으면, 그 사실과 ‘Scheduled’ 페이지에서 직접 할 수 있는 방법을 알려 줘.
${LATER_KO}`
});
const en=url=>({
 claude:`Help me connect Kongboda Motorsports and set up automatic live briefings (F1 and WEC), all the way through. Do what you can yourself, and give me the clicks only I can make one at a time, briefly.
1. Check whether the Kongboda Motorsports connector is available in this chat. If it is, go to step 3.
2. If not, I have to add the connector myself, so walk me through this and stop here.
- In claude.ai on the web or the desktop app, open Customize → Connectors (https://claude.ai/customize/connectors).
- Click + Add → Add custom connector, fill in the fields below, then click Continue. Name: Kongboda Motorsports, MCP server URL: ${url}
- For authentication choose Sign in now, and for the OAuth client choose Register automatically (change it if No sign-in is selected). Leave request headers empty and click Add.
- Click Connect and approve with the Google account you use for Kongboda.
- Turn on Kongboda Motorsports under + → Connectors in a new chat and send this message again.
- On Team or Enterprise plans an organisation owner may need to allow custom connectors first.
${PICK_EN}
${SCHEDULE_EN}
7. If you cannot create scheduled tasks here, tell me why and how to create them myself from Scheduled in the left sidebar with the instructions above. Scheduled tasks need a Pro, Max, Team or Enterprise plan.
${LATER_EN}`,
 chatgpt:`Help me connect Kongboda Motorsports and set up automatic live briefings (F1 and WEC), all the way through. Do what you can yourself, and give me the clicks only I can make one at a time, briefly.
1. Check whether the Kongboda Motorsports app is available in this chat. If it is, go to step 3.
2. If not, I have to install the plugin myself, so walk me through this and stop here.
- On chatgpt.com open Plugins (https://chatgpt.com/plugins) and click Add custom MCP server.
- Fill in the fields below. Name: Kongboda Motorsports, server URL: ${url}
- Choose OAuth, leave the advanced OAuth settings as they are, click Create and approve with my Google account.
- In a new chat pick Kongboda Motorsports from the + menu or with @ and send this message again.
- If the tools do not show, open Plugins → Kongboda Motorsports → Manage, click Refresh tools and set permissions to allow read-only tools.
- Business, Enterprise and Edu workspaces may need an admin to allow it first.
${PICK_EN}
${SCHEDULE_EN}
7. If my plan cannot run hourly tasks (the free plan runs at most once a day) or scheduled tasks cannot use this app, tell me so and what I can do from the Scheduled page.
${LATER_EN}`
});
export const SETUP_PROMPTS=ko(URL_MCP);
export const setupPrompts=withAddress=>withAddress?SETUP_PROMPTS:ko(NO_URL_KO);
export function aiSetupStep({withAddress=false}={}){
 const p=setupPrompts(withAddress);
 return `<li id="ai-setup"><h3>사용하는 AI에 추가하세요</h3><p>쓰는 AI의 프롬프트를 복사해 새 대화에 붙여 넣으세요.<br>연결부터 F1·WEC 중 고른 종목의 자동 브리핑 예약까지 AI가 처리하고, 직접 누를 단계만 안내합니다.</p><p class="prompt-links"><button class="link-copy" type="button" data-copy-from="prompt-claude">Claude용 프롬프트 복사</button><button class="link-copy" type="button" data-copy-from="prompt-chatgpt">ChatGPT용 프롬프트 복사</button></p><pre id="prompt-claude" hidden>${p.claude}</pre><pre id="prompt-chatgpt" hidden>${p.chatgpt}</pre><p class="fine">커넥터 추가, Google 승인, WEC의 FIAWEC+ 로그인(처음 한 번)은 직접 해야 합니다. 자동 브리핑은 예약 작업을 쓰는 유료 요금제에서 1시간마다 옵니다.</p></li>`;
}
export const setupTranslations={
 '쓰는 AI의 프롬프트를 복사해 새 대화에 붙여 넣으세요.':'Copy the prompt for your AI and paste it into a new chat.',
 '연결부터 F1·WEC 중 고른 종목의 자동 브리핑 예약까지 AI가 처리하고, 직접 누를 단계만 안내합니다.':'Your AI handles everything from connecting to booking automatic briefings for the series you pick (F1, WEC or both) and points out the clicks only you can make.',
 'Claude용 프롬프트 복사':'Copy Claude prompt','ChatGPT용 프롬프트 복사':'Copy ChatGPT prompt',
 '커넥터 추가, Google 승인, WEC의 FIAWEC+ 로그인(처음 한 번)은 직접 해야 합니다. 자동 브리핑은 예약 작업을 쓰는 유료 요금제에서 1시간마다 옵니다.':'You add the connector, approve Google sign-in and, for WEC, sign in to FIAWEC+ (once) yourself. Automatic briefings arrive hourly through scheduled tasks on paid plans.'
};
for(const [k,e] of [[ko(URL_MCP),en(URL_MCP)],[ko(NO_URL_KO),en(NO_URL_EN)]])for(const key of ['claude','chatgpt'])setupTranslations[k[key]]=e[key];
// Underlined text buttons: the prompts are the action, not more content to read.
// Scoped three classes deep so the theme's button fill (:root[data-theme] button) does not apply.
export const setupStepCss=`.prompt-links{display:flex;flex-wrap:wrap;gap:4px 28px;margin:0}.guide-steps .prompt-links .link-copy{appearance:none;min-height:44px;padding:0;border:0;border-radius:2px;background:none;box-shadow:none;font:inherit;font-size:17px;font-weight:700;color:var(--mint);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:6px;cursor:pointer}.guide-steps .prompt-links .link-copy:hover{background:none;text-decoration-thickness:3px}.guide-steps .prompt-links .link-copy:focus-visible{outline:2px solid var(--mint);outline-offset:4px}`;
