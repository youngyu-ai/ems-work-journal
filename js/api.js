export const GAS_API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx5tizEgp6f_7Rmx6jzorkDYddm-KwahOrjUNhwrDtN9Loq3ylnodUlV6cdMhneCVtw9Q/exec';

export async function callGasApi(action, params = {}) {
  const isGet = action === 'search' || action === 'getTasks';
  
  if (isGet) {
    const queryParams = new URLSearchParams({ action, ...params });
    const res = await fetch(`${GAS_API_ENDPOINT}?${queryParams.toString()}`, {
      method: 'GET',
      mode: 'cors'
    });
    if (!res.ok) throw new Error(`GAS 請求錯誤: ${res.statusText}`);
    return await res.json();
  } else {
    // 針對 POST 操作使用純文字傳輸 JSON，規避複雜 Preflight 阻擋
    const res = await fetch(GAS_API_ENDPOINT, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ action, ...params })
    });
    if (!res.ok) throw new Error(`GAS 寫入失敗: ${res.statusText}`);
    return await res.json();
  }
}
