import React, { useState, useEffect } from 'react';
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
  Legend,
  ArcElement,
  DoughnutController
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import KakaoAdFit from './components/KakaoAdFit';
import { Analytics } from '@vercel/analytics/react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController
);



function UploadPage() {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisMessage, setAnalysisMessage] = useState('');
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let timer;
        if (loading) {
            setAnalysisMessage('이미지를 확인 중입니다.');
            timer = setTimeout(() => {
                setAnalysisMessage('얼굴을 찾고 있습니다.');
                setTimeout(() => {
                    setAnalysisMessage('얼굴을 분석중입니다.');
                    setTimeout(() => {
                        setAnalysisMessage('퍼스널 컬러를 분석중입니다.');
                        setTimeout(() => {
                            setAnalysisComplete(true);
                        }, 10000);
                    }, 10000);
                }, 10000);
            }, 10000);
        }
        return () => {
            clearTimeout(timer);
            setAnalysisComplete(false);
        };
    }, [loading]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setImage(file);
        } else {
            alert('이미지 파일만 업로드 가능합니다.');
        }
    };

    const handleUpload = async () => {
        if (!image || loading) return;
        
        setLoading(true);
        setAnalysisComplete(false);
        const formData = new FormData();
        
        try {
            formData.append("image", image);
            const API_URL = "https://pcolorweb.onrender.com";

            const response = await axios.post(
                `${API_URL}/analyze`,
                formData,
                { 
                    headers: { "Content-Type": "multipart/form-data" }
                }
            );
            
            if (response.data && !response.data.error) {
                // 응답 데이터를 임시 저장
                const resultData = response.data;
                
                // analysisComplete가 true가 될 때까지 기다린 후 결과 설정
                const checkComplete = setInterval(() => {
                    if (analysisComplete) {
                        setAnalysisResult(resultData);
                        setLoading(false);
                        clearInterval(checkComplete);
                    }
                }, 1000);

                // 안전장치: 60초 후에는 강제로 종료
                setTimeout(() => {
                    clearInterval(checkComplete);
                    if (!analysisResult) {
                        setAnalysisResult(resultData);
                        setLoading(false);
                    }
                }, 60000);
            }
        } catch (error) {
            console.error("Upload error:", error);
            if (error.response?.data?.errorType === "NO_FACE_DETECTED") {
                alert("얼굴을 찾을 수 없습니다. 정면을 바라보는 다른 사진으로 시도해주세요.");
            } else {
                alert("이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
            setAnalysisComplete(false);
            setLoading(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('dragover');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setImage(file);
        } else {
            alert('이미지 파일만 업로드 가능합니다.');
        }
    };

    // 서버 ping 함수 추가
    const pingServer = async () => {
        try {
            const API_URL = "https://pcolorweb.onrender.com";
            await axios.get(`${API_URL}/ping`);
            console.log('Server pinged successfully');
        } catch (error) {
            console.error('Failed to ping server:', error);
        }
    };

    // 컴포넌트 마운트 시 5분마다 서버에 ping
    useEffect(() => {
        // 초기 ping
        pingServer();
        
        // 5분마다 ping 반복
        const interval = setInterval(pingServer, 8 * 60 * 1000);
        
        // 컴포넌트 언마운트 시 interval 정리
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container">
            <div className="ad-section">
                <KakaoAdFit 
                    unit="DAN-Vc8hjg8RFxxUyYjP"
                    width="320"
                    height="100"
                />
            </div>

            <section className="service-intro">
                <h1>AI 퍼스널 컬러 분석</h1>
                <p>
                    AI 이미지 분석 기술로 당신만의 퍼스널 컬러를 찾아보세요.<br/>
                    얼굴 사진 하나로 피부톤을 분석하고 어울리는 컬러를 추천해드립니다.
                </p>
                <div className="service-features">
                    <div className="feature">
                        <svg 
                            className="feature-icon" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <h3>정확한 분석</h3>
                        <p>AI 이미지 처리 기술로<br/>피부톤을 정밀하게 분석</p>
                    </div>
                    <div className="feature">
                        <svg 
                            className="feature-icon" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                            <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                            <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        <h3>맞춤 추천</h3>
                        <p>분석 결과에 따른<br/>맞춤형 컬러 팔레트 제공</p>
                    </div>
                    <div className="feature">
                        <svg 
                            className="feature-icon" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <h3>즉시 확인</h3>
                        <p>분석 결과 차트와 함께<br/>한눈에 확인</p>
                    </div>
                    <div className="feature">
                        <svg 
                            className="feature-icon" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <h3>안전한 분석</h3>
                        <p>이미지는 분석 후<br/>즉시 삭제됩니다</p>
                    </div>
                </div>
            </section>

            <section className="upload-section">
                <div className={`upload-box ${image ? 'has-image' : ''}`}>
                    <label htmlFor="image-upload" className="upload-label">
                        <svg 
                            className="upload-icon" 
                            width="50" 
                            height="50" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="upload-text">
                            {image ? '이미지 변경하기' : '이미지 업로드하기'}
                        </span>
                    </label>
                    <input
                        id="image-upload"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden-input"
                    />
                    {image && (
                        <img 
                            src={URL.createObjectURL(image)} 
                            alt="업로드된 이미지 미리보기" 
                            className="preview-image"
                        />
                    )}
                </div>
                {!analysisResult ? (
                    <>
                        <button 
                            className={`upload-button ${loading ? 'loading' : ''}`}
                            onClick={handleUpload} 
                            disabled={!image || loading}
                        >
                            {loading ? (
                                <div className="loading-container">
                                    <span>이미지 분석 중입니다</span>
                                    <div className="loading-spinner"></div>
                                    <p className="loading-description">
                                        {analysisMessage}
                                    </p>
                                </div>
                            ) : (
                                <span>분석하기</span>
                            )}
                        </button>
                        <p className="analysis-warning">
                            분석에는 40초~1분 정도 소요됩니다.<br/>
                            정확한 분석을 위해 페이지를 나가지 말고 기다려주세요.
                        </p>
                        <div className="ad-section">
                            <KakaoAdFit 
                                unit="DAN-Z0CXfVubRP0mNMgu"
                                width="320"
                                height="50"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <section className="result-section">
                            <div className="result-title">
                                당신은 <span style={{color: '#FF6B6B'}}>{analysisResult.season}</span> 입니다!
                            </div>
                            <div className="keywords-section">
                                <div className="keywords-container">
                                    {analysisResult.characteristics.map((characteristic, index) => (
                                        <span key={index} className="keyword">
                                            {characteristic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="color-section">
                                <div className={`best-colors ${analysisResult.season.split(' ')[0].toLowerCase()}`}>
                                    <h3>추천 컬러</h3>
                                    <div className="color-boxes">
                                        {analysisResult.best_colors.map((color, index) => (
                                            <div key={index} className="color-box">
                                                <div
                                                    style={{
                                                        backgroundColor: color.value,
                                                        border: '1px solid rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                                <span className="color-name">{color.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                        <button 
                            className="upload-button result"
                            onClick={() => navigate('/result', { state: { result: analysisResult } })}
                        >
                            결과 상세보기
                        </button>
                        <div className="ad-section">
                            <KakaoAdFit 
                                unit="DAN-Z0CXfVubRP0mNMgu"
                                width="320"
                                height="50"
                            />
                        </div>
                    </>
                )}
            </section>

            <div className="ad-section">
                <KakaoAdFit 
                    unit="DAN-Z0CXfVubRP0mNMgu"
                    width="320"
                    height="50"
                />
            </div>

            <section className="analysis-explanation">
                <h3>AI 분석 프로세스</h3>
                <p>
                    본 서비스는 컴퓨터 비전과 머신러닝 기술을 활용하여 다음과 같은 과정으로 분석을 진행합니다:
                </p>
                <ul className="analysis-steps">
                    <li>얼굴 영역 검출 및 피부톤 추출
                        <p>- Haar Cascade 알고리즘을 사용하여 얼굴을 감지하고 T존과 U존으로 분리</p>
                    </li>
                    <li>피부톤 분석을 위한 전처리
                        <p>- 조명 보정 및 그림자 영향 최소화</p>
                        <p>- 피부색 마스크를 생성하여 피부 영역만 추출</p>
                    </li>
                    <li>Lab 색공간에서의 색상값 분석
                        <p>- L(명도), a(붉은/녹색), b(노란/파란) 값 측정</p>
                        <p>- T존과 U존의 가중 평균값 계산</p>
                    </li>
                    <li>퍼스널 컬러 특성 분석
                        <p>- 밝기(명도): 매우 밝음 ~ 어두움</p>
                        <p>- 따뜻함(색상): 매우 따뜻함 ~ 매우 차가움</p>
                        <p>- 선명도(채도): 매우 선명함 ~ 뮤트함</p>
                    </li>
                    <li>퍼스널 컬러 시즌 판정
                        <p>- 봄/여름/가을/겨울 웜톤/쿨톤 분류</p>
                        <p>- 브라이트/라이트/딥/뮤트 세부 유형 판정</p>
                    </li>
                </ul>
                <p>
                    분석 결과는 조명, 카메라 설정, 화장 여부 등에 따라 달라질 수 있으며,
                    전문가의 대면 진단을 완전히 대체할 수는 없습니다.
                </p>
            </section>
            <div className="info-section">
                <p className="info-text">
                    이 검사는 AI 이미지 분석 모델을 통해 얼굴의 색상값을 분석하는 방식으로 진행됩니다.<br/>
                    조명, 그림자, 화장, 카메라 설정에 따라 결과가 다르게 나올 수 있습니다.
                </p>
                <p className="info-text important">
                    실제 퍼스널 컬러 검사 결과와 다를 수 있습니다.
                </p>
                <p className="info-text">
                    정확한 결과를 위해 아래 사항을 지켜주세요:
                </p>
                <ul className="info-list">
                    <li>자연광이나 밝은 조명 아래에서 촬영한 사진을 사용해주세요</li>
                    <li>정면을 바라보는 얼굴이 잘 보이는 사진을 사용해주세요</li>
                    <li>화장을 하지 않은 맨 얼굴 사진을 권장합니다</li>
                </ul>
                
                <p className="info-text">
                    분석에는 최대 3분이 소요될 수 있습니다.
                </p>
                
                <p className="info-text important">
                    분석에 사용된 이미지는 어디에도 저장되지 않으며, 분석 후 즉시 삭제됩니다.
                </p>
                
                <a 
                    href="https://www.instagram.com/dev_.min/profilecard/?igsh=MW40YnFiNm4wYmY4ag=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instagram-button"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    개발자 인스타그램
                </a>
            </div>

            <div className="ad-section">
                <KakaoAdFit 
                    unit="DAN-Vc8hjg8RFxxUyYjP"
                    width="320"
                    height="100"
                />
            </div>
        </div>
    );
}

function ResultPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const result = location.state?.result;


    const calculateRelativeValue = (value, threshold) => {
        // 임계값과의 차이를 -30 ~ +30 범위로 제한
        const difference = value - threshold;
        return Math.max(-10, Math.min(10, difference)); // 차이를 그대로 사용
    };

    const chartData = {
        labels: ['밝기', '웜톤/웜톤', '선명도'],
        datasets: [
            {
                label: '',
                data: [
                    calculateRelativeValue(result.lab_values.L, 160),  // 밝기 임계값: 140
                    calculateRelativeValue((result.lab_values.a * 0.5 + result.lab_values.b * 0.5), 140),  // 웜톤/쿨톤 임계값: 140
                    calculateRelativeValue(Math.sqrt((result.lab_values.a**2 + result.lab_values.b**2)/2), 140)  // 선명도 임계값: 140
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
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
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
            x: {
                beginAtZero: true,
                suggestedMin: -10,
                suggestedMax: 10,
                ticks: {
                    stepSize: 1,
                    callback: function(value) {
                        if (Number.isInteger(value)) {
                            if (value === 0) return '기준값';
                            return value;
                        }
                        return '';
                    }
                },
                grid: {
                    color: context => context.tick.value === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)',
                    drawTicks: true,
                    tickLength: 4,
                    stepSize: 0.5
                }
            }
        },
        barThickness: 23,
        animation: {
            duration: 2000
        }
    };

    const doughnutData = {
        labels: ['밝기', '따뜻함', '선명도'],
        datasets: [{
            data: [
                Math.abs(result.skin_tone.brightness - 160),  // 기준값(140)과의 차이
                Math.abs(result.skin_tone.warmth - 140),
                Math.abs(result.skin_tone.contrast - 140)
            ],
            backgroundColor: [
                'rgba(255, 223, 61, 0.7)',  // 밝기: 노란색
                'rgba(255, 87, 51, 0.7)',   // 따뜻함: 주황색
                'rgba(147, 112, 219, 0.7)'  // 선명도: 보라색
            ],
            borderColor: [
                'rgba(255, 223, 61, 1)',
                'rgba(255, 87, 51, 1)',
                'rgba(147, 112, 219, 1)'
            ],
            borderWidth: 1
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%',
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.raw;
                        const label = context.label;
                        return `${label}: ${value.toFixed(1)}`;
                    }
                }
            }
        }
    };

    // 디버깅을 위 로그 추가
    console.log('전체 결과:', result);
    console.log('RGB 값:', result?.rgb_values);

    const handleCopy = () => {
        navigator.clipboard.writeText('pcolorweb.vercel.app')
            .then(() => {
                alert('주소가 복사되었습니다!');
            })
            .catch(err => {
                console.error('복사 실패:', err);
                alert('주소 복사에 실패했습니다.');
            });
    };

    return (
        <div className="container">
            <div className="ad-section">
                <KakaoAdFit 
                    unit="DAN-Vc8hjg8RFxxUyYjP"
                    width="320"
                    height="100"
                />
            </div>

            <h1>AI 퍼스널 컬러 분석 결과</h1>
            <div className="result-section">
                <div className="result-title">
                    당신은 <span style={{color: '#FF6B6B'}}>{result.season}</span> 입니다!
                    <div className="website-link-container">
                        <span className="website-link">pcolorweb.vercel.app</span>
                        <button onClick={handleCopy} className="copy-button">
                            <svg 
                                width="12" 
                                height="12" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div className="keywords-section">
                    <div className="keywords-container">
                        {result.characteristics.map((characteristic, index) => (
                            <span key={index} className="keyword">
                                {characteristic}
                            </span>
                        ))}
                    </div>
                    <div className="skin-tone-chart">
                        <Doughnut data={doughnutData} options={doughnutOptions} />
                    </div>
                </div>

                <div className="chart-section">
                    <Bar data={chartData} options={chartOptions} />
                </div>

                <div className="color-section">
                    <div className={`best-colors ${result.season.split(' ')[0].toLowerCase()}`}>
                        <h3>추천 컬러</h3>
                        <div className="color-boxes">
                            {result.best_colors.map((color, index) => (
                                <div key={index} className="color-box">
                                    <div
                                        style={{
                                            backgroundColor: color.value,
                                            border: '1px solid rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <span className="color-name">{color.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={`worst-colors ${result.season.split(' ')[0].toLowerCase()}`}>
                        <h3>피해야 할 컬러</h3>
                        <div className="color-boxes">
                            {result.worst_colors.map((color, index) => (
                                <div key={index} className="color-box">
                                    <div
                                        style={{
                                            backgroundColor: color.value,
                                            border: '1px solid rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <span className="color-name">{color.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="button-group">
                    <button 
                        className="upload-button reset"
                        onClick={() => navigate('/')}
                    >
                        다시 검사하기
                    </button>
                    <a 
                        href="https://www.instagram.com/dev_.min/profilecard/?igsh=MW40YnFiNm4wYmY4ag=="
                        target="_blank"
                        rel="noopener noreferrer"
                        className="instagram-button result"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        개발자 인스타그램
                    </a>
                </div>
                <div className="ad-section">
                <KakaoAdFit 
                    unit="DAN-Z0CXfVubRP0mNMgu"
                    width="320"
                    height="50"
                    />
                </div>
            </div>
        </div>
    );
}

function AppBar() {
    const location = useLocation();
    const navigate = useNavigate();
    
    // 결과 페이지('/result')에서는 앱바를 숨김
    if (location.pathname === '/result') {
        return null;
    }
    
    return (
        <div className="app-bar">
            <div className="app-bar-content">
                <h1 onClick={() => navigate('/')} className="app-title">AI 퍼스널 컬러</h1>
                <div className="nav-buttons">
                    <button 
                        onClick={() => navigate('/info')} 
                        className="info-button"
                    >
                        AI 퍼스널컬러란?
                    </button>
                    <button 
                        onClick={() => navigate('/codeinfo')} 
                        className="code-button"
                    >
                        분석 코드 살펴보기
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoPage() {
    return (
        <div className="info-page-container">
            <KakaoAdFit 
                unit="DAN-Vc8hjg8RFxxUyYjP"
                width="320"
                height="100"
            />
            
            <div className="info-card">
                <h2>1. 퍼스널 컬러란?</h2>
                <p>
                    퍼스널 컬러는 개인의 타고난 피부톤, 눈동자, 머리카락 등과 자연스럽게 어우러지는 
                    색상을 의미합니다. 이는 단순한 선호도나 유행을 넘어서는 과학적인 색채 분석 시스템으로, 
                    개인의 이미지를 극대화할 수 있는 색상 선택의 기준이 됩니다.
                </p>
            </div>

            <div className="info-card">
                <h2>2. 퍼스널 컬러 진단 방법</h2>
                <h4>1) 이미지 전처리</h4>
                <p>
                    - 노이즈 제거 및 조명 보정<br/>
                    - 얼굴 영역 검출 (Haar Cascade 알고리즘)<br/>
                    - T존/U존 분리 및 피부 마스크 생성
                </p>
                
                <h4>2) 피부톤 분석</h4>
                <p>분석은 다음 세 가지 주요 지표를 기준으로 합니다:</p>
                <ul>
                    <li>
                        <strong>밝기(명도)</strong>
                        <p>- 매우 밝음 (L &gt; 168)</p>
                        <p>- 밝음 (164 &lt; L ≤ 168)</p>
                        <p>- 중간 (160 &lt; L ≤ 164)</p>
                        <p>- 어두움 (L ≤ 160)</p>
                    </li>
                    <li>
                        <strong>따뜻함(색상)</strong>
                        <p>- 매우 따뜻함 (warmth &gt; 145)</p>
                        <p>- 따뜻함 (142.5 &lt; warmth ≤ 145)</p>
                        <p>- 중성 (140 &lt; warmth ≤ 142.5)</p>
                        <p>- 차가움 (warmth ≤ 140)</p>
                    </li>
                    <li>
                        <strong>선명도(채도)</strong>
                        <p>- 매우 선명함 (contrast &gt; 145)</p>
                        <p>- 선명함 (142.5 &lt; contrast ≤ 145)</p>
                        <p>- 중간 (140 &lt; contrast ≤ 142.5)</p>
                        <p>- 뮤트함 (contrast ≤ 140)</p>
                    </li>
                </ul>

                <h4>3) 계절 유형 판정</h4>
                <p>분석된 특성을 바탕으로 다음과 같이 계절을 판정합니다:</p>
                <ul>
                    <li>
                        <strong>봄 웜톤</strong>
                        <p>- 브라이트: 밝고 선명한 톤</p>
                        <p>- 라이트: 밝고 부드러운 톤</p>
                    </li>
                    <li>
                        <strong>여름 쿨톤</strong>
                        <p>- 브라이트: 밝고 선명한 톤</p>
                        <p>- 라이트: 밝고 부드러운 톤</p>
                    </li>
                    <li>
                        <strong>가을 웜톤</strong>
                        <p>- 딥: 깊이 있는 톤</p>
                        <p>- 뮤트: 차분한 톤</p>
                    </li>
                    <li>
                        <strong>겨울 쿨톤</strong>
                        <p>- 딥: 진하고 강한 톤</p>
                        <p>- 뮤트: 차분하고 깊이 있는 톤</p>
                    </li>
                </ul>
            </div>

            <div className="info-card">
                <h2>3. 계절별 특징</h2>
                <h4>봄 웜톤의 특징</h4>
                <ul>
                    <li>밝고 선명한 톤</li>
                    <li>노란빛이 도는 밝은 피부</li>
                    <li>선명하고 부드러운 이미지</li>
                    <li>봄처럼 생기 있고 활기찬 이미지 연출</li>
                </ul>
                
                <h4>여름 쿨톤의 특징</h4>
                <ul>
                    <li>부드럽고 연한 톤</li>
                    <li>붉은빛이 도는 밝은 피부</li>
                    <li>시원하고 우아한 이미지</li>
                    <li>여름처럼 산뜻하고 세련된 이미지 연출</li>
                </ul>

                <h4>가을 웜톤의 특징</h4>
                <ul>
                    <li>깊이 있고 차분한 톤</li>
                    <li>노란빛이 도는 피부</li>
                    <li>편안하고 성숙한 이미지</li>
                    <li>가을처럼 차분하고 고급스러운 이미지 연출</li>
                </ul>

                <h4>겨울 쿨톤의 특징</h4>
                <ul>
                    <li>선명하고 강한 톤</li>
                    <li>핑크빛이 도는 피부</li>
                    <li>시크하고 도시적인 이미지</li>
                    <li>겨울처럼 모던하고 세련된 이미지 연출</li>
                </ul>
            </div>
            
            <KakaoAdFit 
                unit="DAN-Vc8hjg8RFxxUyYjP"
                width="320"
                height="100"
            />
        </div>
    );
}

function CodeInfo() {
    return (
        <div className="container code-info-page">
            <KakaoAdFit 
                unit="DAN-Vc8hjg8RFxxUyYjP"
                width="320"
                height="100"
            />
            
            <h2>AI 퍼스널 컬러 분석 알고리즘 상세 설명</h2>
            
            <section className="code-analysis">
                <h3>1. 얼굴 검출 및 영역 분할</h3>
                <div className="code-section">
                    <pre>{`
def extract_skin_color(image_path):
    # 얼굴 검출
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    # T존과 U존 분리
    face_height, face_width = face_roi.shape[:2]
    t_zone = face_roi[0:int(face_height*0.6), int(face_width*0.3):int(face_width*0.7)]
    u_zone = face_roi[int(face_height*0.3):int(face_height*0.7), 0:int(face_width)]
                    `}</pre>
                </div>
                <div className="code-explanation">
                    <h4>Haar Cascade 얼굴 검출</h4>
                    <p>
                        OpenCV의 Haar Cascade 분류기는 머신러닝 기반의 객체 검출 알고리즘입니다. 
                        이 알고리즘은 다음과 같은 특징을 가집니다:
                    </p>
                    <ul>
                        <li>cascade 구조로 빠른 검출 속도 보장</li>
                        <li>수천 개의 얼굴 이미지로 사전 학습된 모델 사용</li>
                        <li>다양한 크기와 각도의 얼굴 검출 가능</li>
                    </ul>

                    <h4>얼굴 영역 분할 (T존/U존)</h4>
                    <p>
                        검출된 얼굴을 분석에 용이하도록 두 영역으로 분할합니다:
                    </p>
                    <ul>
                        <li>T존 (이마와 코 부위): 전체 높이의 60%, 중앙 40% 영역</li>
                        <li>U존 (양 볼 부위): 중간 높이의 40%, 전체 너비</li>
                        <li>각 역은 서로 다른 특성을 가지므로 개별 분석 후 가중 평균 계산</li>
                    </ul>
                </div>

                <h3>2. 조명 보정 및 피부색 추출</h3>
                <div className="code-section">
                    <pre>{`
def correct_lighting(img):
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2Lab)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_Lab2RGB)

def create_skin_mask(img):
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2Lab)
    lower_skin = np.array([40, 130, 130])
    upper_skin = np.array([220, 150, 150])
    return cv2.inRange(lab, lower_skin, upper_skin)
                    `}</pre>
                </div>
                <div className="code-explanation">
                    <h4>CLAHE 조명 보정</h4>
                    <p>
                        CLAHE(Contrast Limited Adaptive Histogram Equalization)는 
                        지역적 히스토그램 평활화를 수행하는 고급 이미지 처리 알고리즘입니다:
                    </p>
                    <ul>
                        <li>이미지를 8x8 타일로 분할하여 각 영역별 독립적인 히스토그램 평활화 수행</li>
                        <li>clipLimit=3.0으로 설정하여 과도한 대비 향상 방지</li>
                        <li>조명의 영향을 최소화하면서 피부톤의 자연스러운 특성 보존</li>
                    </ul>

                    <h4>Lab 색공간 변환</h4>
                    <p>
                        RGB가 아닌 Lab 색공간을 사용하는 이유:
                    </p>
                    <ul>
                        <li>L: 명도(Lightness) - 밝기 정보를 독립적으로 표현</li>
                        <li>a: 빨강-초록 축 - 피부의 붉은 기 측정</li>
                        <li>b: 노랑-파랑 축 - 피부의 황색 기 측정</li>
                        <li>인간의 시각 인지 방식과 유사한 구조</li>
                    </ul>

                    <h4>피부색 마스크 생성</h4>
                    <p>
                        Lab 색공간에서 정의된 피부색 범위를 사용하여 마스크 생성:
                    </p>
                    <ul>
                        <li>L값 범위 [40, 220]: 매우 어두운 피부톤부터 매우 밝은 피부톤까지 포함</li>
                        <li>a값 범위 [130, 150]: 적절한 붉은 기 범위 지정</li>
                        <li>b값 범위 [130, 150]: 적절한 황색 기 범위 지정</li>
                    </ul>
                </div>

                <h3>3. 퍼스널 컬러 분석 알고리즘</h3>
                <div className="code-section">
                    <pre>{`
# 피부톤 특성 분석
brightness = L
warmth = (a * 0.5) + (b * 0.5)
contrast = np.sqrt((a**2 + b**2)/2)

if warmth > warmth_threshold['neutral']:  # 웜톤
    if brightness > brightness_threshold['bright']:  # 밝은 톤
        if contrast > contrast_threshold['medium_high']:
            season = "봄 웜 브라이트"
        else:
            season = "봄 웜 라이트"
    else:  # 어두운 톤
        if contrast > contrast_threshold['medium_high']:
            season = "가을 웜 딥"
        else:
            season = "가을 웜 뮤트"
                    `}</pre>
                </div>
                <div className="code-explanation">
                    <h4>계절 판정 로직</h4>
                    <p>
                        계산된 특성값을 기반으로 다음과 같은 의사결정 트리를 통해 계절을 판정합니다:
                    </p>
                    <ul>
                        <li>1단계: 웜톤/쿨톤 구분 (warmth 값 기준)</li>
                        <li>2단계: 밝기 레벨 판정 (brightness 값 기준)</li>
                        <li>3단계: 선명도 판정 (contrast 값 기준)</li>
                        <li>4단계: 최종 세부 유형 결정</li>
                    </ul>

                    <p>
                        예를 들어, "봄 웜 브라이트"로 판정되는 경우:
                    </p>
                    <ul>
                        <li>warmth &gt; 142.5 (웜톤)</li>
                        <li>brightness &gt; 164 (밝은톤)</li>
                        <li>contrast &gt; 142.5 (선명한톤)</li>
                    </ul>
                </div>
            </section>
            
            <KakaoAdFit 
                unit="DAN-Vc8hjg8RFxxUyYjP"
                width="320"
                height="100"
            />
        </div>
    );
}

function App() {
    return (
        <Router>
            <AppBar />
            <Routes>
                <Route path="/" element={<UploadPage />} />
                <Route path="/result" element={<ResultPage />} />
                <Route path="/info" element={<InfoPage />} />
                <Route path="/codeinfo" element={<CodeInfo />} />
            </Routes>
            <Analytics />
        </Router>
    );
}

export default App;
