import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ExifTags
import io
import tempfile
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

def extract_skin_color(image_path):
    """피부색 추출 및 세분화된 퍼스널 컬러 분석"""
    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # 얼굴 검출
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    if len(faces) == 0:
        return {"error": "얼굴을 찾을 수 없습니다."}

    x, y, w, h = faces[0]
    face_roi = image[y:y+h, x:x+w]

    # 1. 얼굴 영역 분할 (T존, U존)
    face_height, face_width = face_roi.shape[:2]
    t_zone = face_roi[0:int(face_height*0.6), int(face_width*0.3):int(face_width*0.7)]
    u_zone = face_roi[int(face_height*0.3):int(face_height*0.7), 0:int(face_width)]

    # 2. 조명 보정
    def correct_lighting(img):
        lab = cv2.cvtColor(img, cv2.COLOR_RGB2Lab)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        corrected = cv2.merge([l, a, b])
        return cv2.cvtColor(corrected, cv2.COLOR_Lab2RGB)

    t_zone = correct_lighting(t_zone)
    u_zone = correct_lighting(u_zone)

    # 3. 피부색 마스크 생성 (개선된 범위)
    def create_skin_mask(img):
        lab = cv2.cvtColor(img, cv2.COLOR_RGB2Lab)
        lower_skin = np.array([40, 130, 130])  # 더 엄격한 범위
        upper_skin = np.array([220, 150, 150])
        return cv2.inRange(lab, lower_skin, upper_skin)

    # 4. 이상치 제거
    def remove_outliers(values, threshold=1.5):
        q1 = np.percentile(values, 25)
        q3 = np.percentile(values, 75)
        iqr = q3 - q1
        lower_bound = q1 - threshold * iqr
        upper_bound = q3 + threshold * iqr
        return values[(values >= lower_bound) & (values <= upper_bound)]

    # 5. 가중치를 적용한 평균 계산
    def weighted_mean(t_zone_values, u_zone_values):
        t_zone_weight = 0.4  # T존 가중치
        u_zone_weight = 0.6  # U존 가중치
        
        t_filtered = remove_outliers(t_zone_values)
        u_filtered = remove_outliers(u_zone_values)
        
        return (np.mean(t_filtered) * t_zone_weight + 
                np.mean(u_filtered) * u_zone_weight)

    # 각 영역별 Lab 값 계산
    t_mask = create_skin_mask(t_zone)
    u_mask = create_skin_mask(u_zone)

    t_skin = cv2.bitwise_and(cv2.cvtColor(t_zone, cv2.COLOR_RGB2Lab), 
                            cv2.cvtColor(t_zone, cv2.COLOR_RGB2Lab), 
                            mask=t_mask)
    u_skin = cv2.bitwise_and(cv2.cvtColor(u_zone, cv2.COLOR_RGB2Lab), 
                            cv2.cvtColor(u_zone, cv2.COLOR_RGB2Lab), 
                            mask=u_mask)

    # 최종 Lab 값 계산
    L = weighted_mean(t_skin[:,:,0][t_mask > 0], u_skin[:,:,0][u_mask > 0])
    a = weighted_mean(t_skin[:,:,1][t_mask > 0], u_skin[:,:,1][u_mask > 0])
    b = weighted_mean(t_skin[:,:,2][t_mask > 0], u_skin[:,:,2][u_mask > 0])

    # 피부톤 분석 기준값 수정
    brightness_threshold = {
        'very_bright': 168,  # 값 하향 조정
        'bright': 164,
        'medium': 160,
        'dark': 155
    }
    
    # warmth 임계값 수정
    warmth_threshold = {
        'very_warm': 145,
        'warm': 142.5,
        'neutral': 140,
        'cool': 137.5,
        'very_cool': 135
    }
    
    # contrast 임계값 수정
    contrast_threshold = {  
        'high': 145,        # 값 하향 조정
        'medium_high': 142.5,
        'medium': 140,
        'low': 135
    }

    # 계산 방식 수정
    brightness = L
    warmth = (a * 0.5) + (b * 0.5)
    contrast = np.sqrt((a**2 + b**2)/2)  # 대비 계산 방식 수정

    # 피부 톤 특성 분석
    if brightness > brightness_threshold['very_bright']:
        brightness_characteristic = "매우 밝은"
    elif brightness > brightness_threshold['bright']:
        brightness_characteristic = "밝은"
    elif brightness > brightness_threshold['medium']:
        brightness_characteristic = "중간"
    else:
        brightness_characteristic = "어두운"

    if warmth > warmth_threshold['very_warm']:
        warmth_characteristic = "매우 따뜻한"
    elif warmth > warmth_threshold['warm']:
        warmth_characteristic = "따뜻한"
    elif warmth > warmth_threshold['neutral']:
        warmth_characteristic = "약간 따뜻한"
    elif warmth > warmth_threshold['cool']:
        warmth_characteristic = "약간 차가운"
    elif warmth > warmth_threshold['very_cool']:
        warmth_characteristic = "차가운"
    else:
        warmth_characteristic = "매우 차가운"

    if contrast > contrast_threshold['high']:
        contrast_characteristic = "매우 선명한"
    elif contrast > contrast_threshold['medium_high']:
        contrast_characteristic = "선명한"
    elif contrast > contrast_threshold['medium']:
        contrast_characteristic = "중간"
    else:
        contrast_characteristic = "뮤트한"

    # 세부 시즌 결정 로직 수정
    season = ""
    characteristics = []
    
    # 웜톤/쿨톤 판단 로직 수정
    if warmth > warmth_threshold['neutral']:  # 웜톤
        if brightness > brightness_threshold['bright']:  # 밝은 톤
            if contrast > contrast_threshold['medium_high']:
                season = "봄 웜 브라이트"
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "선명하고 밝은 색상이 잘 어울림"
                ]
            elif contrast > contrast_threshold['medium']:
                season = "봄 웜 라이트"
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "부드럽고 밝은 색상이 잘 어울림"
                ]
            else:
                season = "가을 웜 뮤트"  # 밝지만 대비가 낮은 경우
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "차분하고 부드러운 색상이 잘 어울림"
                ]
        else:  # 어두운 톤
            if contrast > contrast_threshold['medium_high']:
                season = "가을 웜 딥"
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "깊이 있는 가을 색상이 잘 어울림"
                ]
            else:
                season = "가을 웜 뮤트"
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "차분하고 깊이 있는 색상이 잘 어울림"
                ]
    else:  # 쿨톤
        if brightness > brightness_threshold['bright']:  # 밝은 톤
            if contrast > contrast_threshold['medium_high']:
                season = "여름 쿨 브라이트"
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "선명한 파스텔 색이 잘 어울림"
                ]
            elif contrast > contrast_threshold['medium']:
                season = "여름 쿨 라이트"
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "부드러운 파스텔 색상이 잘 어울림"
                ]
            else:
                season = "겨울 쿨 뮤트"  # 밝지만 대비가 낮은 경우
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "차분하고 시원한 색상이 잘 어울림"
                ]
        else:  # 어두운 톤
            if contrast > contrast_threshold['medium_high']:
                season = "겨울 쿨 딥"
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "선명하고 강한 색상이 잘 어울림"
                ]
            else:
                season = "겨울 쿨 뮤트"
                characteristics = [
                    f"{brightness_characteristic} 피부톤",
                    f"{warmth_characteristic} 톤",
                    f"{contrast_characteristic} 대비",
                    "차분하고 깊이 있는 색상이 잘 어울림"
                ]

    # 각 시즌별 추천 색상
    color_recommendations = {
        "봄 웜 브라이트": [
            {"name": "코랄", "value": "#FF6B6B"},
            {"name": "황금색", "value": "#FFD93D"},
            {"name": "밝은 오렌지", "value": "#FF9F43"},
            {"name": "선명한 노랑", "value": "#FFF222"}
        ],
        "봄 웜 라이트": [
            {"name": "피치", "value": "#FFCBA4"},
            {"name": "연한 옐로우", "value": "#FFF5BA"},
            {"name": "살몬 핑크", "value": "#FFA07A"},
            {"name": "아이보리", "value": "#FFFFF0"}
        ],
        "가을 웜 뮤트": [
            {"name": "카키", "value": "#967969"},
            {"name": "캐멀", "value": "#C19A6B"},
            {"name": "모카 브라운", "value": "#493D26"},
            {"name": "앤틱 골드", "value": "#CFB53B"}
        ],
        "가을 웜 딥": [
            {"name": "버건디", "value": "#800020"},
            {"name": "다크 브라운", "value": "#654321"},
            {"name": "올리브 그린", "value": "#556B2F"},
            {"name": "테라코타", "value": "#E2725B"}
        ],
        "여름 쿨 브라이트": [
            {"name": "푸시아 핑크", "value": "#FF69B4"},
            {"name": "로얄 블루", "value": "#4169E1"},
            {"name": "라벤더", "value": "#E6E6FA"},
            {"name": "민트", "value": "#98FF98"}
        ],
        "여름 쿨 라이트": [
            {"name": "파우더 블루", "value": "#B0E0E6"},
            {"name": "로즈 핑크", "value": "#FFB6C1"},
            {"name": "라일락", "value": "#C8A2C8"},
            {"name": "그레이", "value": "#D3D3D3"}
        ],
        "겨울 쿨 뮤트": [
            {"name": "차콜 그레이", "value": "#36454F"},
            {"name": "소프트 네이비", "value": "#000F89"},
            {"name": "버건디", "value": "#800020"},
            {"name": "플럼", "value": "#673147"}
        ],
        "겨울 쿨 딥": [
            {"name": "버건디", "value": "#800020"},
            {"name": "다크 네이비", "value": "#000080"},
            {"name": "에메랄드", "value": "#50C878"},
            {"name": "플럼", "value": "#673147"}
        ]
    }

    # 피하면 좋을 색상
    colors_to_avoid = {
        "봄": [
            {"name": "블랙", "value": "#000000"},
            {"name": "네이비", "value": "#000080"},
            {"name": "차가운 파스텔", "value": "#E6E6FA"}
        ],
        "여름": [
            {"name": "오렌지", "value": "#FFA500"},
            {"name": "브라운", "value": "#8B4513"},
            {"name": "골드", "value": "#FFD700"}
        ],
        "가을": [
            {"name": "네온", "value": "#39FF14"},
            {"name": "실버", "value": "#C0C0C0"},
            {"name": "차가운 파스텔", "value": "#E6E6FA"}
        ],
        "겨울": [
            {"name": "베이지", "value": "#F5F5DC"},
            {"name": "카키", "value": "#967969"},
            {"name": "황갈색", "value": "#DAA520"}
        ]
    }
    
    base_season = season.split()[0]  # "봄", "여름", "가을", "겨울" 추출

    # 디버깅을 위한 출력 추가
    print(f"원본 Lab 값: L={L:.2f}, a={a:.2f}, b={b:.2f}")
    print(f"계산된 값: brightness={brightness:.2f}, warmth={warmth:.2f}, contrast={contrast:.2f}")
    print(f"특성: {brightness_characteristic}, {warmth_characteristic}, {contrast_characteristic}")
    print(f"피부톤 판정: {warmth > warmth_threshold['neutral']}")
    print(f"밝기 판정: {brightness > brightness_threshold['bright']}")
    print(f"대비 판정: {contrast > contrast_threshold['medium_high']}")
    print(f"판정 기준:")
    print(f"웜톤/쿨톤: {warmth} > {warmth_threshold['neutral']}")
    print(f"밝기: {brightness} > {brightness_threshold['bright']}")
    print(f"대비: {contrast} > {contrast_threshold['medium_high']}")
    print(f"최종 판정: {season}")

    return {
        "season": season,
        "characteristics": characteristics,
        "skin_tone": {
            "brightness": float(brightness),
            "warmth": float(warmth),
            "contrast": float(contrast),
            "brightness_level": brightness_characteristic,
            "warmth_level": warmth_characteristic,
            "contrast_level": contrast_characteristic
        },
        "best_colors": color_recommendations[season],
        "worst_colors": colors_to_avoid[base_season],
        "lab_values": {
            "L": float(L),
            "a": float(a),
            "b": float(b)
        },
        "tone_analysis": {
            "brightness_level": brightness_characteristic,
            "warmth_level": warmth_characteristic,
            "contrast_level": contrast_characteristic
        }
    }

def fix_image_rotation(image):
    try:
        for orientation in ExifTags.TAGS.keys():
            if ExifTags.TAGS[orientation] == 'Orientation':
                break
        exif = dict(image._getexif().items())

        if exif[orientation] == 3:
            image = image.rotate(180, expand=True)
        elif exif[orientation] == 6:
            image = image.rotate(270, expand=True)
        elif exif[orientation] == 8:
            image = image.rotate(90, expand=True)
    except (AttributeError, KeyError, IndexError):
        # 이미지에 Exif 데이터가 없는 경우
        pass
    return image

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        image = Image.open(request.files['image'])
        image = fix_image_rotation(image)  # 이미지 방향 보정
        
        # 이미지 크기 체크 및 리사이징
        image = Image.open(image)
        
        # 최대 크기 제한
        max_size = (1024, 1024)  # 예: 1024x1024
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # 이미지 저장
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='JPEG')
        img_byte_arr = img_byte_arr.getvalue()
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            temp_file.write(img_byte_arr)
            analysis_result = extract_skin_color(temp_file.name)
            
        os.unlink(temp_file.name)  # 임시 파일 삭제
        
        if "error" in analysis_result:
            return jsonify({
                "error": "얼굴을 찾을 수 없습니다.",
                "errorType": "NO_FACE_DETECTED"
            }), 400

        return jsonify(analysis_result)

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}", exc_info=True)
        return jsonify({"error": "이미지 처리 중 오류가 발생했습니다."}), 500

if __name__ == '__main__':
    app.run()