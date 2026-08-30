import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export default function useAlertDetail(state, district) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canFetch = useMemo(() => Boolean(state && district), [state, district]);

  const fetchCore = useCallback(async () => {
    if (!canFetch) return;
    setData(null);
    setLoading(true);
    setError('');
    try {
      const { data: detail } = await api.get(
        `/alert-detail/${encodeURIComponent(state)}/${encodeURIComponent(district)}`,
        { timeout: 20000 },
      );
      setData(detail);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load alert details');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canFetch, district, state]);

  const retry = useCallback(() => {
    fetchCore();
  }, [fetchCore]);

  useEffect(() => {
    if (!canFetch) return;
    fetchCore();
  }, [canFetch, fetchCore]);

  return {
    data,
    loading,
    error,
    retry,
  };
}
