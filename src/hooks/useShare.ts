import { useEffect, useState, useCallback, type Dispatch } from 'react';
import { supabase, genShareId, buildSharePayload, saveShare, loadShare } from '../lib/share';
import type { TabsState, TabsAction, ToastKind } from '../types';

export function useShare(
  tabsData: TabsState,
  dispatch: Dispatch<TabsAction>,
  showToast: (msg: string, kind: ToastKind) => void,
) {
  const [isShareLoading, setIsShareLoading] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('s');
    if (!id) return;
    if (!supabase) { showToast('Supabase não carregou — não foi possível abrir o link.', 'error'); return; }

    loadShare(id)
      .then(payload => {
        const state = Object.fromEntries(
          Object.entries(payload).map(([tab, pdfs]) => [tab, { pdfs }])
        ) as Partial<TabsState>;
        dispatch({ type: 'HYDRATE', state: state as TabsState });
      })
      .catch(err => {
        console.error('[share load]', err);
        showToast('Link não encontrado ou expirado.', 'error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyShareableLink = useCallback(async () => {
    if (!supabase) { showToast('Supabase não carregou — verifique a conexão.', 'error'); return; }
    const payload = buildSharePayload(tabsData);
    if (!payload) { showToast('Nada para compartilhar ainda — faça upload de um PDF primeiro.', 'error'); return; }
    setIsShareLoading(true);
    try {
      const id = genShareId();
      await saveShare(id, payload);
      const url = `${location.origin}${location.pathname}?s=${id}`;
      await navigator.clipboard.writeText(url);
      showToast('✓ Link copiado! Compartilhe com seu time.', 'success');
    } catch (err) {
      console.error('[share save]', err);
      showToast('Falha ao salvar link: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setIsShareLoading(false);
    }
  }, [tabsData, showToast]);

  return { copyShareableLink, isShareLoading };
}
