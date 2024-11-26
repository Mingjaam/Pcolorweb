import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import tempfile

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

def optimize_image_for_mobile(image):
    """모바일 처리를 위한 이미지 최적화"""
    # 최대 크기 설정 (모바일 처리에 적합한 크기)
    MAX_SIZE = 800
    
    height, width = image.shape[:2]
    
    # 이미지가 너무 크면 리사이징
    if max(height, width) > MAX_SIZE:
        scale = MAX_SIZE / max(height, width)
        new_width = int(width * scale)
        new_height = int(height * scale)
        image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    return image

def extract_skin_color(image_path):
    """피부색 추출 및 세분화된 퍼스널 컬러 분석"""
    try:
        # 이미지 로드 및 최적화
        image = cv2.imread(image_path)
        if image is None:
            return {"error": "이미지를 불러올 수 없습니다."}
            
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = optimize_image_for_mobile(image)

        # 메모리 효율적인 얼굴 검출
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # 다양한 스케일로 얼굴 검출 시도
        faces = []
        scale_factors = [1.1, 1.15, 1.2]
        min_neighbors_options = [3, 4, 5]
        
        for scale in scale_factors:
            for min_neighbors in min_neighbors_options:
                faces = face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=scale,
                    minNeighbors=min_neighbors,
                    minSize=(int(gray.shape[0]*0.1), int(gray.shape[0]*0.1))  # 이미지 크기에 비례하는 최소 얼굴 크기
                )
                if len(faces) > 0:
                    break
            if len(faces) > 0:
                break

        if len(faces) == 0:
            return {"error": "얼굴을 찾을 수 없습니다."}

        # 가장 큰 얼굴 선택 (중앙에 있는 얼굴일 가능성이 높음)
        if len(faces) > 1:
            faces = sorted(faces, key=lambda x: x[2]*x[3], reverse=True)
        
        x, y, w, h = faces[0]
        
        # 얼굴 영역이 너무 작은 경우 처리
        if (w * h) < (image.shape[0] * image.shape[1] * 0.01):  # 전체 이미지의 1% 미만
            return {"error": "얼굴이 너무 작습니다. 더 가까이서 찍은 사진을 사용해주세요."}

        # 메모리 효율을 위한 관심 영역 추출
        face_roi = image[y:y+h, x:x+w].copy()
        del image  # 원본 이미지 메모리 해제

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
                        "선명한 파스텔 색상이 잘 어울림"
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

    except Exception as e:
        print(f"Error in extract_skin_color: {e}")
        return {"error": "이미지 처리 중 오류가 발생했습니다."}

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({"error": "이미지가 업로드되지 않았습니다."}), 400

    image_file = request.files['image']

    try:
        # 임시 파일 처리 개선
        with tempfile.NamedTemporaryFile(delete=True, suffix='.jpg') as tmp:
            image = Image.open(image_file)
            
            # 이미지 방향 보정
            try:
                if hasattr(image, '_getexif'):
                    exif = image._getexif()
                    if exif is not None:
                        orientation = exif.get(274)  # 274는 Orientation 태그
                        if orientation is not None:
                            if orientation == 3:
                                image = image.rotate(180, expand=True)
                            elif orientation == 6:
                                image = image.rotate(270, expand=True)
                            elif orientation == 8:
                                image = image.rotate(90, expand=True)
            except:
                pass  # EXIF 처리 실패 시 무시
                
            # 이미지 저장 및 분석
            image.save(tmp.name, 'JPEG', quality=85)  # 약간의 품질 감소로 파일 크기 최적화
            analysis_result = extract_skin_color(tmp.name)

        if "error" in analysis_result:
            error_message = analysis_result["error"]
            if "너무 작습니다" in error_message:
                return jsonify({
                    "error": error_message,
                    "errorType": "FACE_TOO_SMALL"
                }), 400
            return jsonify({
                "error": error_message,
                "errorType": "NO_FACE_DETECTED"
            }), 400

        return jsonify(analysis_result)

    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({"error": "이미지 처리 중 오류가 발생했습니다."}), 500

if __name__ == '__main__':
    app.run()