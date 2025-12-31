interface AuthResult {
  success: boolean;
  userId?: string;
  email?: string;
  tenantId?: string;
  error?: string;
}

export async function signInWithDialog(): Promise<AuthResult> {
  return new Promise((resolve, reject) => {
    const dialogUrl = `${process.env.REACT_APP_API_URL}/api/auth/start`;
    
    Office.context.ui.displayDialogAsync(
      dialogUrl,
      { height: 60, width: 30, promptBeforeOpen: false },
      (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          reject(new Error(`Dialog failed: ${result.error.message}`));
          return;
        }

        const dialog = result.value;
        
        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: any) => {
          dialog.close();
          
          try {
            const response: AuthResult = JSON.parse(arg.message);
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || 'Authentication failed'));
            }
          } catch (e) {
            reject(new Error('Invalid response from auth dialog'));
          }
        });

        dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg: any) => {
          dialog.close();
          reject(new Error(`Dialog closed: ${arg.error}`));
        });
      }
    );
  });
}

export async function getCurrentUser(): Promise<{ userId: string; email: string; tenantId: string } | null> {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/me`, {
      credentials: 'include'
    });
    
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    return await response.json();
  } catch (err) {
    console.error('Failed to get current user:', err);
    return null;
  }
}

export async function signOut(): Promise<void> {
  await fetch(`${process.env.REACT_APP_API_URL}/api/auth/signout`, {
    method: 'POST',
    credentials: 'include'
  });
}
