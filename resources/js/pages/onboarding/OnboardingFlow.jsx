import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../api';

const OnboardingFlow = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await api.get('/me');
                const user = response.data.user;
                const employee = user.employee;

                if (!employee) {
                    navigate('/admin/dashboard');
                    return;
                }

                if (!employee.employee_number || !employee.nik) {
                    navigate('/onboarding/complete-profile');
                    return;
                }

                if (!employee.face_enrolled) {
                    navigate('/onboarding/face-enrollment');
                    return;
                }

                navigate('/onboarding/device');

            } catch (error) {
                console.error("Failed to check onboarding status", error);
                navigate('/login');
            }
        };

        checkStatus();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Memeriksa status akun Anda...</p>
        </div>
    );
};

export default OnboardingFlow;
