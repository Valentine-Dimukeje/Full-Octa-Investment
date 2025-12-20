import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ReferrerHandler() {
    const { username } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (username) {
            console.log(`Setting referrer: ${username}`);
            localStorage.setItem('referrer', username);
        }
        navigate('/register');
    }, [username, navigate]);

    return null;
}

export default ReferrerHandler;
