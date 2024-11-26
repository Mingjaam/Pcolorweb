import React, { useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState({
        season: '',
        characteristics: [],
        skin_tone: { brightness: 0, warmth: 0, contrast: 0 },
        best_colors: [],
        worst_colors: [],
        lab_values: { L: 0, a: 0, b: 0 },
        tone_analysis: {
            brightness_level: '',
            warmth_level: '',
            contrast_level: ''
        }
    });

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            try {
                // 이미지 미리보기 및 방향 수정
                const orientation = await getImageOrientation(file);
                const compressedImage = await compressImage(file, orientation);
                setImage(compressedImage);
            } catch (error) {
                console.error('Image processing error:', error);
                alert('이미지 처리 중 오류가 발생했습니다.');
            }
        } else {
            alert('이미지 파일만 업로드 가능합니다.');
        }
    };

    const getImageOrientation = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const view = new DataView(e.target.result);
                if (view.getUint16(0, false) != 0xFFD8) {
                    resolve(-2);
                    return;
                }
                const length = view.byteLength;
                let offset = 2;
                while (offset < length) {
                    if (view.getUint16(offset+2, false) <= 8) break;
                    const marker = view.getUint16(offset, false);
                    offset += 2;
                    if (marker == 0xFFE1) {
                        if (view.getUint32(offset += 2, false) != 0x45786966) {
                            resolve(-1);
                            return;
                        }
                        const little = view.getUint16(offset += 6, false) == 0x4949;
                        offset += view.getUint32(offset + 4, little);
                        const tags = view.getUint16(offset, little);
                        offset += 2;
                        for (let i = 0; i < tags; i++) {
                            if (view.getUint16(offset + (i * 12), little) == 0x0112) {
                                resolve(view.getUint16(offset + (i * 12) + 8, little));
                                return;
                            }
                        }
                    } else if ((marker & 0xFF00) != 0xFF00) {
                        break;
                    } else {
                        offset += view.getUint16(offset, false);
                    }
                }
                resolve(-1);
            };
            reader.readAsArrayBuffer(file);
        });
    };

    const compressImage = async (file, orientation) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (orientation === 6) {
                        width = img.height;
                        height = img.width;
                    } else if (orientation === 8) {
                        width = img.height;
                        height = img.width;
                    }

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    }, 'image/jpeg', 0.7);  // 품질 70%로 압축
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleUpload = async () => {
        if (!image) {
            alert("이미지를 업로드하세요!");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        
        try {
            // 이미지 압축
            const compressedImage = await compressImage(image);
            formData.append("image", compressedImage);

            const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

            const response = await axios.post(
                `${API_URL}/analyze`,
                formData,
                { 
                    headers: { "Content-Type": "multipart/form-data" },
                    timeout: 30000  // 타임아웃 30초로 설정
                }
            );
            setResult(response.data);
        } catch (error) {
            console.error("Error uploading image:", error);
            if (error.response?.data?.errorType === "NO_FACE_DETECTED") {
                alert("얼굴을 찾을 수 없습니다. 정면을 바라보는 다른 사진으로 시도해주세요.");
            } else {
                alert("이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
            setImage(null);
            setResult({
                season: '',
                characteristics: [],
                skin_tone: { brightness: 0, warmth: 0, contrast: 0 },
                best_colors: [],
                worst_colors: [],
                lab_values: { L: 0, a: 0, b: 0 },
                tone_analysis: {
                    brightness_level: '',
                    warmth_level: '',
                    contrast_level: ''
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateRelativeValue = (value, threshold) => {
        // 임계값과의 차이를 -30 ~ +30 범위로 제한
        const difference = value - threshold;
        return Math.max(-10, Math.min(10, difference)); // 차이를 그대로 사용
    };

    const chartData = {
        labels: ['밝기', '웜톤/쿨톤', '선명도'],
        datasets: [
            {
                label: '분석 결과',
                data: [
                    calculateRelativeValue(result.lab_values.L, 160),  // 밝기 임계값: 140
                    calculateRelativeValue((result.lab_values.a * 0.5 + result.lab_values.b * 0.5), 140),  // 웜톤/쿨톤 임계값: 135
                    calculateRelativeValue(Math.sqrt((result.lab_values.a**2 + result.lab_values.b**2)/2), 140)  // 선명도 임계값: 130
                ],
                backgroundColor: [
                    'rgba(255, 223, 61, 0.7)',
                    'rgba(255, 87, 51, 0.7)',
                    'rgba(147, 112, 219, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 223, 61, 1)',
                    'rgba(255, 87, 51, 1)',
                    'rgba(147, 112, 219, 1)'
                ],
                borderWidth: 2
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom'
            },
            title: {
                display: true,
                text: '피부톤 분석 결과',
                font: {
                    size: 14
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                suggestedMin: -10,
                suggestedMax: 10,
                ticks: {
                    stepSize: 0.5,
                    callback: function(value) {
                        if (value === 0) return '기준값';
                        return value;
                    }
                },
                grid: {
                    color: context => context.tick.value === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'
                }
            }
        },
        animation: {
            duration: 2000
        }
    };

    const ColorBox = ({ color }) => (
        <div className="color-box">
            <div
                style={{
                    backgroundColor: color.value,
                    border: '1px solid rgba(0,0,0,0.1)'
                }}
            />
            <span className="color-name">{color.name}</span>
        </div>
    );

    return (
        <div className="container">
            <h1>퍼스널 컬러 분석</h1>
            
            <div className="upload-section">
                <div className={`upload-box ${image ? 'has-image' : ''}`}>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                    />
                    {image && (
                        <img src={URL.createObjectURL(image)} alt="Preview" />
                    )}
                </div>
                <button 
                    className={`upload-button ${loading ? 'loading' : ''}`}
                    onClick={handleUpload} 
                    disabled={!image || loading}
                >
                    {loading ? (
                        <span>분석 중...</span>
                    ) : (
                        <span>분석하기</span>
                    )}
                </button>
            </div>

            {result.season && (
                <div className="result-section">
                    <div className="result-title">
                        당신은 <span style={{color: '#FF6B6B'}}>{result.season}</span> 입니다!
                    </div>
                    
                    <div className="chart-section">
                        <Bar data={chartData} options={chartOptions} />
                    </div>

                    <div className="color-section">
                        <div className={`best-colors ${result.season.split(' ')[0].toLowerCase()}`}>
                            <h3>추천 컬러</h3>
                            <div className="color-boxes">
                                {result.best_colors.map((color, index) => (
                                    <ColorBox key={index} color={color} />
                                ))}
                            </div>
                        </div>
                        <div className={`worst-colors ${result.season.split(' ')[0].toLowerCase()}`}>
                            <h3>피해야 할 컬러</h3>
                            <div className="color-boxes">
                                {result.worst_colors.map((color, index) => (
                                    <ColorBox key={index} color={color} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;