/**
 * ============================================================================
 * APOCALYPSE ENGINE : PROCEDURAL ITEM GENERATOR (v1.0)
 * ============================================================================
 * 1,000개가 넘는 방대한 무기 데이터를 절차적으로 생성하는 코어 스크립트입니다.
 * 픽셀 뼈대(Base)에 속성(Element)과 등급(Rank) 변이를 주어 무한에 가까운
 * 무기 조합을 만들어냅니다.
 */

(function() {
    // 1. 고해상도 픽셀 아트 뼈대 (Base Templates - 16x16 & 20x20)
    // 0:투명, 1:검은테두리, 2:어두운회색, 3:중간회색, 4:밝은회색/은색
    // X: 동적 컬러(속성에 따라 변함), Y: 동적 광원(발광부)
    const BASE_TEMPLATES = [
        {
            type: "DAGGER",
            name: "서바이벌 나이프",
            baseAtk: 5,
            data: `
0000000000000044
000000000000044X
00000000000044X0
0000000000044X00
000000000044X000
00000001144X0000
0000001X14X00000
000001XX14000000
00001XX100000000
0001XX1000000000
001XX10000000000
01XX100000000000
0111000000000000
0000000000000000`
        },
        {
            type: "REVOLVER",
            name: "매그넘 리볼버",
            baseAtk: 12,
            data: `
0000000000000000
0000000000000000
0011111111111000
0144444444444100
014XX33333334100
0011111114444100
000000001XXXX100
000000001XXXX100
0000000011111100
0000000000000000`
        },
        {
            type: "KATANA",
            name: "사이버 카타나",
            baseAtk: 25,
            data: `
000000000000000011
0000000000000011YY
00000000000011YYX0
000000000011YYX000
0000000011YYX00000
00000011YYX0000000
000011YYX000000000
0011YYX00000000000
01111X000000000000
001XX1000000000000
0001XX100000000000
000011000000000000`
        },
        {
            type: "SHOTGUN",
            name: "택티컬 샷건",
            baseAtk: 40,
            data: `
0000000000000000
1111111111111110
1444444444444441
133YY333333YY331
1111111111111110
001XX22222100000
0011111111000000
001XX10000000000
001XX10000000000
011XX11000000000
0111111000000000`
        },
        {
            type: "RIFLE",
            name: "플라즈마 소총",
            baseAtk: 65,
            data: `
0000000000011111
00000000001YXXY1
11111111111YXXY1
14444444444YYXY1
1422244222411111
1422244222444441
1111111111111111
0001X33310000000
0001111110000000
0001X31000000000
0011X31100000000`
        },
        {
            type: "SNIPER",
            name: "입자 가속 저격총",
            baseAtk: 110,
            data: `
0000000111110000
0000011YXYXY1100
1111114YYXYY4111
1444444444444441
1111114XXXXX4111
0000011XXXXX1100
0000000111110000
0000000122210000
0000001122211000
0000001111111000`
        },
        {
            type: "SCYTHE",
            name: "영혼 수확기",
            baseAtk: 150,
            data: `
000000001111111111
00000011YXYXYXYX10
000011YXYX11111100
0011YXYX1100000000
11YXYX110000000000
1YXY11000000000000
111100000000000000
0001X1000000000000
00001X100000000000
000001X10000000000
0000001X1000000000
000000011000000000`
        },
        {
            type: "BFG",
            name: "아포칼립스 캐논",
            baseAtk: 300,
            data: `
0000111111111100
0001444444444410
0014YYYYYYYYYY41
014YXXXXYXXYXYX2
14YYXYYYYXYYYYY4
14YXXYXXYXXYXXX4
014YXYXYXYXYXYX2
0014YYYYYYYYYY41
0001444444444410
0000111111111100
0000013333100000
0000113333110000
0001133333311000`
        }
    ];

    // 2. 랭크 확률 및 배율 설정
    const RANKS = [
        { id: 'N', weight: 500, multiplier: 1, color: '#aaaaaa', prefix: ["낡은", "녹슨", "보급형", "손상된", "평범한"] },
        { id: 'R', weight: 300, multiplier: 2.5, color: '#00aaff', prefix: ["강화된", "전술형", "경량화", "개조된", "합금"] },
        { id: 'SR', weight: 150, multiplier: 6, color: '#b300ff', prefix: ["프로토타입", "하이퍼", "사이버", "초전도", "엘리트"] },
        { id: 'SSR', weight: 49, multiplier: 15, color: '#ffcc00', prefix: ["전설의", "다크매터", "초차원", "절대", "종말의"] },
        { id: 'UR', weight: 1, multiplier: 50, color: '#ff003c', prefix: ["【신살자】", "【알파&오메가】", "【공허의 유산】", "【아포칼립스】"] } // 히든 등급
    ];

    // 3. 속성 컬러 및 네이밍 변형 (X, Y 픽셀 치환용)
    const ELEMENTS = [
        { name: "물리", codeX: '3', codeY: '4', hex: '#888888' },      // 무속성
        { name: "화염", codeX: '9', codeY: '8', hex: '#ff003c' },      // 9:빨강, 8:노랑
        { name: "빙결", codeX: '7', codeY: 'A', hex: '#00ffff' },      // 7:시안, A:흰색
        { name: "맹독", codeX: '5', codeY: '7', hex: '#33ff00' },      // 5:네온그린
        { name: "공허", codeX: '6', codeY: '9', hex: '#b300ff' },      // 6:보라
        { name: "신성", codeX: '8', codeY: 'A', hex: '#ffcc00' }       // 8:골드
    ];

    // 4. 아이템 1,000개 절차적 생성 엔진
    window.GAME_ITEMS = {};

    function generateMassiveItemDatabase() {
        let itemCount = 0;

        // [Phase 1] 1번부터 1,000번까지 무작위 조합 생성
        for (let i = 1; i <= 1000; i++) {
            // 1. 뼈대 선택
            const base = BASE_TEMPLATES[Math.floor(Math.random() * BASE_TEMPLATES.length)];
            
            // 2. 랭크 선택 (가중치 기반)
            const totalWeight = RANKS.reduce((sum, r) => sum + r.weight, 0);
            let rand = Math.random() * totalWeight;
            let rankObj = RANKS[0];
            for (let r of RANKS) {
                if (rand < r.weight) { rankObj = r; break; }
                rand -= r.weight;
            }

            // 3. 속성 선택
            const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];

            // 4. 이름 조합
            const prefix = rankObj.prefix[Math.floor(Math.random() * rankObj.prefix.length)];
            let finalName = rankObj.id === 'UR' ? `${prefix} ${base.name}` : `${prefix} ${element.name} ${base.name}`;
            
            // UR 등급은 번호 부여로 유니크함 강조
            if (rankObj.id === 'UR') finalName += ` Mk-${Math.floor(Math.random()*999)}`;

            // 5. 픽셀 데이터 컬러 치환 (X, Y 렌더링)
            // 원본 데이터를 복사하면서 X와 Y를 선택된 속성의 컬러 코드로 변경
            let pixelData = base.data.replace(/X/g, element.codeX).replace(/Y/g, element.codeY);

            // 6. 능력치 연산 (기본 공격력 * 랭크 배율 * (0.8~1.2 난수))
            let finalAtk = Math.floor(base.baseAtk * rankObj.multiplier * (0.8 + Math.random() * 0.4));

            // 데이터베이스에 등록
            const itemId = `ITEM_${i.toString().padStart(4, '0')}`;
            window.GAME_ITEMS[itemId] = {
                id: itemId,
                name: finalName,
                rank: rankObj.id,
                color: rankObj.id === 'UR' ? '#ff003c' : rankObj.color, // UR은 강렬한 네온 레드
                atk: finalAtk,
                weight: rankObj.weight, // 뽑기 확률 가중치 그대로 사용
                data: pixelData
            };
            itemCount++;
        }

        // [Phase 2] 이스터에그 / 확정 스페셜 아이템 3개 하드코딩 추가
        // 1000개 외에 무조건 존재하는 궁극의 아이템
        window.GAME_ITEMS['ITEM_DOOM_01'] = {
            id: 'ITEM_DOOM_01', name: '【DOOM】 크루시블 (악마학살검)', rank: 'SSR', color: '#ff003c', atk: 9999, weight: 0.5,
            data: `
0000000000000001
0000000000000119
0000000000011999
000000000119A991
0000000119A99110
00000119A9911000
000119A991100000
0019A99110000000
0199911000000000
1991111000000000
1111881100000000
0018888100000000
0001881000000000
0000110000000000`
        };
        
        window.GAME_ITEMS['ITEM_DEV_02'] = {
            id: 'ITEM_DEV_02', name: '【ADMIN】 개발자의 밴 해머', rank: 'UR', color: '#00ffff', atk: 99999, weight: 0.1,
            data: `
0001111111111000
0017777777777100
017A77777777A710
0177777777777710
017A77777777A710
0017777777777100
0001111111111000
0000001441000000
0000001441000000
0000001441000000
0000001441000000
0000001441000000
0000001111000000`
        };

        console.log(`[APOCALYPSE ENGINE] 총 ${itemCount + 2}개의 무기고 데이터베이스가 생성되었습니다.`);
    }

    // 스크립트가 로드되자마자 즉시 1,000개 아이템 생성 실행
    generateMassiveItemDatabase();
})();
