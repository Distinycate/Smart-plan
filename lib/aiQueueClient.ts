type QueueStatus = {
  status: string;
  position: number;
};

export async function queuedAiFetch(
  url: string,
  requestInit: RequestInit,
  onQueueStatus?: (status: QueueStatus) => void
) {
  let jobId = '';
  let finalized = false;

  const finalize = async (action: 'complete' | 'failed', errorCode?: string) => {
    if (!jobId || finalized) return;
    finalized = true;
    try {
      await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId, errorCode }),
      });
    } catch (error) {
      console.error('Unable to finalize queued AI request:', error);
    }
  };

  try {
    const enqueueResponse = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enqueue' }),
    });
    const enqueueResult = await enqueueResponse.json();
    if (!enqueueResponse.ok || !enqueueResult.success) {
      throw new Error(enqueueResult.error || 'ไม่สามารถจองคิว AI ได้');
    }

    jobId = enqueueResult.jobId;
    const startedAt = Date.now();
    let pollFailures = 0;

    while (true) {
      if (Date.now() - startedAt > 5 * 60 * 1000) {
        throw new Error('รอคิว AI เกิน 5 นาที กรุณาลองใหม่อีกครั้ง');
      }

      await new Promise(resolve => setTimeout(resolve, 3_000));
      const statusResponse = await fetch(`/api/queue?jobId=${jobId}`, { cache: 'no-store' });
      const statusResult = await statusResponse.json();

      if (!statusResponse.ok || !statusResult.success) {
        pollFailures += 1;
        if (pollFailures >= 3) {
          throw new Error(statusResult.error || 'ไม่สามารถตรวจสอบคิว AI ได้');
        }
        continue;
      }

      pollFailures = 0;
      onQueueStatus?.({
        status: statusResult.status,
        position: Number(statusResult.position || 0),
      });

      if (statusResult.status === 'processing') break;
      if (['cancel', 'failed', 'expired'].includes(statusResult.status)) {
        finalized = true;
        throw new Error('คิว AI หมดอายุหรือถูกยกเลิก กรุณาลองใหม่อีกครั้ง');
      }
    }

    const requestHeaders = new Headers(requestInit.headers);
    requestHeaders.set('X-AI-Queue-Job', jobId);
    const response = await fetch(url, { ...requestInit, headers: requestHeaders });
    await finalize(response.ok ? 'complete' : 'failed', response.ok ? undefined : `HTTP_${response.status}`);
    return response;
  } catch (error) {
    await finalize('failed', 'E_AI_REQUEST_FAILED');
    throw error;
  }
}
