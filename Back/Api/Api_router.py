import requests
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from Api.Api_schema import SearchDTO, festivalInfoDTO, calendarDTO
from datetime import datetime
from collections import defaultdict
from core.config import get_config

router = APIRouter(
    prefix="/api",
    tags=["api"]
)

config = get_config()

SERVICE_KEY = config.api_service_key

@router.get("/MainPage")
async def get_main_festival():
    # 기본 URL 설정
    BASE_URL = "http://apis.data.go.kr/B551011/KorService1/searchFestival1"

    today_date = datetime.today().strftime("%Y%m%d")

    # 요청 파라미터 설정
    params = {
        "numOfRows": 35,
        "MobileOS": "ETC",
        "MobileApp": "AppTest",
        "_type": "json",
        "arrange": "D",
        "eventStartDate": today_date,
        "serviceKey": SERVICE_KEY
    }

    # API 요청 보내기
    response = requests.get(BASE_URL, params=params)

    if response.status_code == 200:
        # 응답 성공 시 데이터 파싱
        data = response.json()

        # JSON 데이터를 보기 좋게 출력
        #print(json.dumps(data, indent=4, ensure_ascii=False))

        # 특정 정보만 추출해서 보기 좋게 출력 (예시)
        if "response" in data and "body" in data["response"]:
            festivals = data["response"]["body"].get("items", {}).get("item", [])
            refined_festivals = []
            if festivals:
                for festival in festivals:
                    title = festival.get("title", "제목 없음")
                    start_date = festival.get("eventstartdate", "시작일 미제공")
                    end_date = festival.get("eventenddate", "종료일 미제공")
                    addr1 = festival.get("addr1", "주소 미제공")
                    addr2 = festival.get("addr2", "상세주소 미제공")
                    firstimage = festival.get("firstimage", "원본 이미지 미제공")
                    firstimage2 = festival.get("firstimage2", "썸네일 대표 이미지 미제공")
                    areacode = festival.get("areacode", "지역코드 미제공")
                    contentid = festival.get("contentid", "컨텐츠아이디 미제공")
                    contenttypeid = festival.get("contenttypeid", "컨텐츠타입아이디 미제공")
                    sigungucode = festival.get("sigungucode", "시군구코드 미제공")
                    tel = festival.get("tel", "전화번호 미제공")
                    mapx = festival.get("mapx", "GPS X좌표 미제공")
                    mapy = festival.get("mapy", "GPS Y좌표 미제공")

                    refined_festival = {
                        "addr1": addr1,
                        "addr2": addr2,
                        "eventstartdate": start_date,
                        "eventenddate": end_date,
                        "title": title,
                        "firstimage": firstimage,
                        "firstimage2": firstimage2,
                        "areacode": areacode,
                        "contentid": contentid,
                        "contenttypeid": contenttypeid,
                        "sigungucode": sigungucode,
                        "tel": tel,
                        "mapx": mapx,
                        "mapy": mapy,
                    }
                    refined_festivals.append(refined_festival)    
                return refined_festivals        
            else:
                return {"message": "검색된 항목이 없습니다."}
        else:
            return {"message" : "응답에 축제 정보가 포함되어 있지 않습니다."}
    else:
        return {"message" : "API 요청 실패"}

@router.post("/SearchPage")
async def search_keyword(stdo: SearchDTO):
    BASE_URL = "http://apis.data.go.kr/B551011/KorService1/searchKeyword1"

    params = {
        "numOfRows": 10,
        "pageNo": stdo.pageNo,
        "MobileOS": "ETC",
        "MobileApp": "AppTest",
        "_type": "json",
        "listYN": "Y",
        "arrange": "C",
        "keyword": stdo.keyword,
        "contentTypeId": stdo.contentTypeId,
        "serviceKey": SERVICE_KEY
    }

    try:
        response = requests.get(BASE_URL, params=params)
        response.raise_for_status()  # HTTP 오류 발생 시 예외 처리

        try:
            data = response.json()  # 응답이 JSON 형식이어야 함
        except ValueError:
            return {"message": "응답 데이터가 JSON 형식이 아닙니다."}

        if data.get("response", {}).get("header", {}).get("resultCode") == "0000":
            items = data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
            
            if isinstance(items, list) and items:
                festivals = []
                for item in items:
                    contenttypeid = item.get('contenttypeid')
                    contentid = item.get('contentid')
                    contenttypeid = int(contenttypeid)
                    contentid = int(contentid)
                    if contenttypeid == 15: # 행사/공연/축제
                        eventStartDate, eventEndDate = contentID(contentid, contenttypeid)  # contentID 함수 호출
                        festival = {
                            "title": item.get('title', '이름 없음'),
                            "addr1": item.get('addr1', '주소1 없음'),
                            "addr2": item.get('addr2', '주소2 없음'),
                            "areaCode": item.get('areaCode', '지역코드 없음'),
                            "firstimage": item.get('firstimage', '원본이미지 없음'),
                            "firstimage2": item.get('firstimage2', '썸네일이미지 없음'),
                            "contentid": item.get('contentid', '컨텐츠아이디 없음'),
                            "cpyrhtDivCd": item.get('cpyrhtDivCd', '저작권 유형 없음'),
                            "mapx": item.get('mapx', 'GPS X좌표 없음'),
                            "mapy": item.get('mapy', 'GPS Y좌표 없음'),
                            "mlevel": item.get('mlevel', '맵 레벨 없음'),
                            "modifiedtime": item.get('modifiedtime', '콘텐츠 수정일 없음'),
                            "sigungucode": item.get('sigungucode', '시군구코드 없음'),
                            "tel": item.get('tel', '전화번호 없음'),
                            "contenttypeid": item.get('contenttypeid', '컨텐츠타입 없음'),
                            "eventStartDate": eventStartDate,
                            "eventEndDate": eventEndDate,
                        }
                        festivals.append(festival)
                    elif contenttypeid == 14:
                        usetimeculture, restdateculture = contentID(contentid, contenttypeid)
                        festival = {
                            "title": item.get('title', '이름 없음'),
                            "addr1": item.get('addr1', '주소1 없음'),
                            "addr2": item.get('addr2', '주소2 없음'),
                            "areaCode": item.get('areaCode', '지역코드 없음'),
                            "firstimage": item.get('firstimage', '원본이미지 없음'),
                            "firstimage2": item.get('firstimage2', '썸네일이미지 없음'),
                            "contentid": item.get('contentid', '컨텐츠아이디 없음'),
                            "cpyrhtDivCd": item.get('cpyrhtDivCd', '저작권 유형 없음'),
                            "mapx": item.get('mapx', 'GPS X좌표 없음'),
                            "mapy": item.get('mapy', 'GPS Y좌표 없음'),
                            "mlevel": item.get('mlevel', '맵 레벨 없음'),
                            "modifiedtime": item.get('modifiedtime', '콘텐츠 수정일 없음'),
                            "sigungucode": item.get('sigungucode', '시군구코드 없음'),
                            "tel": item.get('tel', '전화번호 없음'),
                            "contenttypeid": item.get('contenttypeid', '컨텐츠타입 없음'),
                            "usetimeculture": usetimeculture,
                            "restdateculture": restdateculture,
                        }
                        festivals.append(festival)
                    elif contenttypeid == 12:
                        opendate, usetime = contentID(contentid, contenttypeid)
                        festival = {
                            "title": item.get('title', '이름 없음'),
                            "addr1": item.get('addr1', '주소1 없음'),
                            "addr2": item.get('addr2', '주소2 없음'),
                            "areaCode": item.get('areaCode', '지역코드 없음'),
                            "firstimage": item.get('firstimage', '원본이미지 없음'),
                            "firstimage2": item.get('firstimage2', '썸네일이미지 없음'),
                            "contentid": item.get('contentid', '컨텐츠아이디 없음'),
                            "cpyrhtDivCd": item.get('cpyrhtDivCd', '저작권 유형 없음'),
                            "mapx": item.get('mapx', 'GPS X좌표 없음'),
                            "mapy": item.get('mapy', 'GPS Y좌표 없음'),
                            "mlevel": item.get('mlevel', '맵 레벨 없음'),
                            "modifiedtime": item.get('modifiedtime', '콘텐츠 수정일 없음'),
                            "sigungucode": item.get('sigungucode', '시군구코드 없음'),
                            "tel": item.get('tel', '전화번호 없음'),
                            "contenttypeid": item.get('contenttypeid', '컨텐츠타입 없음'),
                            "opendate": opendate,
                            "usetime": usetime,
                        }
                        festivals.append(festival)

                return festivals  # JSONResponse 대신 일반적으로 리스트 반환
            else:
                return {"message": "검색된 항목이 없습니다."}

        else:
            result_msg = data.get("response", {}).get("header", {}).get("resultMsg", "알 수 없는 오류")
            return {"message": f"API 호출 오류: {result_msg}"}

    except requests.exceptions.RequestException as e:
        return {"message": f"API 요청 중 오류 발생: {e}"}
    except Exception as e:
        return {"message": f"에러 발생: {e}"}

@router.post("/festivaldetails")
async def get_festival_details(ftinfo: festivalInfoDTO):
    # 기본 URL 설정
    BASE_URL = "http://apis.data.go.kr/B551011/KorService1/detailIntro1"

    # 요청 파라미터 설정
    params = {
        "MobileOS": "ETC",
        "MobileApp": "AppTest",
        "_type": "json",
        "contentId": ftinfo.contentId,
        "contentTypeId": ftinfo.contentTypeId,
        "serviceKey": SERVICE_KEY
    }

    # API 요청 보내기
    response = requests.get(BASE_URL, params=params)

    if response.status_code == 200:
        # 응답 성공 시 데이터 파싱
        data = response.json()

        # 응답 구조 확인
        items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
        
        if items:
            event = items[0]
            # contentTypeId에 따른 출력 구분
            if ftinfo.contentTypeId == 12:  # 관광지
                accomcount = event.get('accomcount', '정보 없음')
                chkbabycarriage = event.get('chkbabycarriage', '정보 없음')
                chkcreditcard = event.get('chkcreditcard', '정보 없음')
                chkpet = event.get('chkpet', '정보 없음')
                expagerange = event.get('expagerange', '정보 없음')
                expguide = event.get('expguide', '정보 없음')
                heritage1 = event.get('heritage1', '정보 없음')
                heritage2 = event.get('heritage2', '정보 없음')
                heritage3 = event.get('heritage3', '정보 없음')
                infocenter = event.get('infocenter', '정보 없음')
                opendate = event.get('opendate', '정보 없음')
                parking = event.get('parking', '정보 없음')
                restdate = event.get('restdate', '정보 없음')
                useseason = event.get('useseason', '정보 없음')
                usetime = event.get('usetime', '정보 없음')

                festival_info = {
                    "accomcount": accomcount,
                    "chkbabycarriage": chkbabycarriage,
                    "chkcreditcard": chkcreditcard,
                    "chkpet": chkpet,
                    "expagerange": expagerange,
                    "expguide": expguide,
                    "heritage1": heritage1,
                    "heritage2": heritage2,
                    "heritage3": heritage3,
                    "infocenter": infocenter,
                    "opendate": opendate,
                    "parking": parking,
                    "restdate": restdate,
                    "useseason": useseason,
                    "usetime": usetime
                }
                return festival_info
            elif ftinfo.contentTypeId == 14:  # 문화시설
                accomcountculture = event.get('accomcountculture', '정보 없음')
                chkbabycarriageculture = event.get('chkbabycarriageculture', '정보 없음')
                chkcreditcardculture = event.get('chkcreditcardculture', '정보 없음')
                chkpetculture = event.get('chkpetculture', '정보 없음')
                discountinfo = event.get('discountinfo', '정보 없음')
                infocenterculture = event.get('infocenterculture', '정보 없음')
                parkingculture = event.get('parkingculture', '정보 없음')
                parkingfee = event.get('parkingfee', '정보 없음')
                restdateculture = event.get('restdateculture', '정보 없음')
                usefee = event.get('usefee', '정보 없음')
                usetimeculture = event.get('usetimeculture', '정보 없음')
                scale = event.get('scale', '정보 없음')
                spendtime = event.get('spendtime', '정보 없음')

                festival_info = {
                    "accomcountculture": accomcountculture,
                    "chkbabycarriageculture": chkbabycarriageculture,
                    "chkcreditcardculture": chkcreditcardculture,
                    "chkpetculture": chkpetculture,
                    "discountinfo": discountinfo,
                    "infocenterculture": infocenterculture,
                    "parkingculture": parkingculture,
                    "parkingfee": parkingfee,
                    "restdateculture": restdateculture,
                    "usefee": usefee,
                    "usetimeculture": usetimeculture,
                    "scale": scale,
                    "spendtime": spendtime
                }
                return festival_info
            elif ftinfo.contentTypeId == 15:  # 행사/공연/축제
                agelimit = event.get('agelimit', '정보 없음')
                bookingplace = event.get('bookingplace', '정보 없음')
                discountinfofestival = event.get('discountinfofestival', '정보 없음')
                eventenddate = event.get('eventenddate', '정보 없음')
                eventhomepage = event.get('eventhomepage', '정보 없음')
                eventplace = event.get('eventplace', '정보 없음')
                eventstartdate = event.get('eventstartdate', '정보 없음')
                festivalgrade = event.get('festivalgrade', '정보 없음')
                placeinfo = event.get('placeinfo', '정보 없음')
                playtime = event.get('playtime', '정보 없음')
                program = event.get('program', '정보 없음')
                spendtimefestival = event.get('spendtimefestival', '정보 없음')
                sponsor1 = event.get('sponsor1', '정보 없음')
                sponsor1tel = event.get('sponsor1tel', '정보 없음')
                sponsor2 = event.get('sponsor2', '정보 없음')
                sponsor2tel = event.get('sponsor2tel', '정보 없음')
                subevent = event.get('subevent', '정보 없음')
                usetimefestival = event.get('usetimefestival', '정보 없음')

                festival_info = {
                    "agelimit": agelimit,
                    "bookingplace": bookingplace,
                    "discountinfofestival": discountinfofestival,
                    "eventenddate": eventenddate,
                    "eventhomepage": eventhomepage,
                    "eventplace": eventplace,
                    "eventstartdate": eventstartdate,
                    "festivalgrade": festivalgrade,
                    "placeinfo": placeinfo,
                    "playtime": playtime,
                    "program": program,
                    "spendtimefestival": spendtimefestival,
                    "sponsor1": sponsor1,
                    "sponsor1tel": sponsor1tel,
                    "sponsor2": sponsor2,
                    "sponsor2tel": sponsor2tel,
                    "subevent": subevent,
                    "usetimefestival": usetimefestival
                }
                return festival_info
            else:
                return {"message": "해당 contentTypeId에 대한 추가 정보가 없습니다."}
        else:
            return {"message": "이벤트 정보가 없습니다."}
    else:
        return {"message": "API 요청 실패: {response.status_code}"}

@router.post("/calendar")
async def calendar(cdto: calendarDTO):
    # 기본 URL 설정
    BASE_URL = "http://apis.data.go.kr/B551011/KorService1/searchFestival1"

    # 해당 월의 시작 날짜 계산
    event_start_date = f"{cdto.Year}{cdto.Month:02d}01"  # YYYYMMDD 형식 (ex: 20250201)

    # 요청 파라미터 설정
    params = {
        "numOfRows": 10000,
        "MobileOS": "ETC",
        "MobileApp": "AppTest",
        "_type": "json",
        "arrange": "D",
        "eventStartDate": event_start_date,
        "serviceKey": SERVICE_KEY
    }

    # API 요청 보내기
    response = requests.get(BASE_URL, params=params)

    if response.status_code == 200:
        data = response.json()

        if "response" in data and "body" in data["response"]:
            festivals = data["response"]["body"].get("items", {}).get("item", [])
            festivals_by_day = defaultdict(list)  # 날짜별 정리

            if festivals:
                for festival in festivals:
                    title = festival.get("title", "제목 없음")
                    start_date = festival.get("eventstartdate", "시작일 미제공")
                    end_date = festival.get("eventenddate", "종료일 미제공")
                    addr1 = festival.get("addr1", "주소 미제공")
                    addr2 = festival.get("addr2", "주소 미제공")
                    firstimage = festival.get("firstimage", "원본 이미지 미제공")
                    firstimage2 = festival.get("firstimage2", "썸네일 대표 이미지 미제공")
                    areacode = festival.get("areacode", "지역코드 미제공")
                    contentid = festival.get("contentid", "컨텐츠아이디 미제공")
                    contenttypeid = festival.get("contenttypeid", "컨텐츠타입아이디 미제공")
                    createdtime = festival.get("createdtime", "등록일 미제공")
                    mapx = festival.get("mapx", "GPS X좌표 미제공")
                    mapy = festival.get("mapy", "GPS Y좌표 미제공")
                    modifiedtime = festival.get("modifiedtime", "수정일 미제공")
                    sigungucode = festival.get("sigungucode", "시군구코드 미제공")
                    mlevel = festival.get("mlevel", "맵 레벨 미제공")
                    tel = festival.get("tel", "전화번호 미제공")
                    

                    if start_date.isdigit() and start_date.startswith(f"{cdto.Year}{cdto.Month:02d}"):
                        day = int(start_date[-2:])  # YYYYMMDD 중 'DD'만 추출
                        festivals_by_day[day].append({
                            "addr1": addr1,
                            "addr2": addr2,
                            "eventstartdate": start_date,
                            "eventenddate": end_date,
                            "title": title,
                            "firstimage" : firstimage,
                            "firstimage2" : firstimage2,
                            "areacode" : areacode,
                            "contentid" : contentid,
                            "contenttypeid" : contenttypeid,
                            "createdtime" : createdtime,
                            "mapx" : mapx,
                            "mapy" : mapy,
                            "modifiedtime" : modifiedtime,
                            "sigungucode" : sigungucode,
                            "mlevel" : mlevel,
                            "tel" : tel,
                            
                        })

                return dict(festivals_by_day) if festivals_by_day else {"message": "해당 월에 대한 축제가 없습니다."}
            else:
                return {"message": "검색된 항목이 없습니다."}
        else:
            return {"message": "응답에 축제 정보가 포함되어 있지 않습니다."}
    else:
        return {"message": "API 요청 실패"}
    
def image_festival(contentID):
    BASE_URL = "http://apis.data.go.kr/B551011/KorService1/detailImage1"

    # API 요청 파라미터
    params = {
        "MobileOS": "ETC",
        "MobileApp": "AppTest",
        "_type": "json",
        "contentId": contentID,
        "imageYN": "Y",
        "subImageYN": "Y",
        "numOfRows": 10,
        "pageNo": 1,
        "serviceKey": SERVICE_KEY
    }

    # API 요청
    try:
        response = requests.get(BASE_URL, params=params)

    # 응답 상태 코드 확인
        if response.status_code == 200:
            # JSON 응답을 파싱
            data = response.json()

            # 결과 확인 및 처리
            if 'response' in data and 'body' in data['response'] and 'items' in data['response']['body']:
                # items는 딕셔너리 내에 'item' 키로 있음
                images = data['response']['body']['items']['item']

                # 포스터 이미지를 먼저 분리
                poster_image = None
                other_images = []

                for img in images:
                    if "포스터" in img['imgname']:
                        poster_image = img  # 포스터 이미지 찾으면 따로 저장
                    else:
                        other_images.append(img)  # 나머지 이미지는 다른 리스트에 저장

                # 포스터 이미지를 첫 번째로 추가하고 나머지 이미지를 뒤에 추가
                if poster_image:
                    images = [poster_image] + other_images
                else:
                    images = other_images

                return JSONResponse(content=images)

            else:
                JSONResponse(status_code=500, content={"message": f"이미지를 찾을 수 없습니다."})
        else:
            return JSONResponse(status_code=500, content={"message": f"API 요청 실패, 상태 코드 {response.status_code}"})

    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"에러 발생: {str(e)}"})

def contentID(contentid, contenttypeid):
    BASE_URL = "http://apis.data.go.kr/B551011/KorService1/detailIntro1"

    params = {
        "MobileOS": "ETC",
        "MobileApp": "AppTest",
        "_type": "json",
        "contentId": contentid,        # 콘텐츠 ID
        "contentTypeId": contenttypeid, # 콘텐츠 타입 ID
        "serviceKey": SERVICE_KEY        # 서비스 키
    }

    try:
        response = requests.get(BASE_URL, params=params)
        response.raise_for_status()  # HTTP 오류 발생 시 예외 처리

        data = response.json()

        # 응답 구조 확인
        items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
        if items:
            event = items[0]
            if contenttypeid == 15:
                eventStartDate = event.get('eventstartdate', '정보 없음')
                eventEndDate = event.get('eventenddate', '정보 없음')
                return eventStartDate, eventEndDate
            if contenttypeid == 14:
                usetimeculture = event.get('usetimeculture', '정보 없음')
                restdateculture = event.get('restdateculture', '정보 없음')
                return usetimeculture, restdateculture
            if contenttypeid == 12:
                opendate = event.get('opendate', '정보 없음')
                usetime = event.get('usetime', '정보 없음')
                return opendate, usetime
        else:
            return '정보 없음', '정보 없음'  # items가 비었을 경우 처리
    except requests.exceptions.RequestException as e:
        return '정보 없음', '정보 없음'  # API 요청 실패 시 처리
    except Exception as e:
        return '정보 없음', '정보 없음'  # 예외 발생 시 처리
