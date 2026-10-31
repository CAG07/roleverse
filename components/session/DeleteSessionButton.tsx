'use client';

// Deletes an ended session log after the player types DELETE. Only rendered for
// ended sessions; the sessions DELETE policy also refuses an open session, so
// the live session can't be deleted out from under the chat.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import styles from './DeleteSessionButton.module.css';

interface DeleteSessionButtonProps {
  campaignId: string;
  sessionId: string;
}

// Deleting removes only this session's own row. Anything copied out of it stays:
// the next session opened with a recap of this one (in that session's transcript
// and summary), and play may have changed the NPC roster, character sheets, or
// campaign notes. The Game Master and Lore Keeper read those, so say so plainly.
const CONFIRM_MESSAGE =
  "This permanently deletes this session's transcript and summary. If this is your most recent " +
  'session, your next session will continue from the one before it. Anything carried out of this ' +
  'session is kept: the recap at the start of later sessions, NPCs added to the roster, character ' +
  'sheet changes, and your campaign notes. The Game Master and Lore Keeper can still recall those.';

export default function DeleteSessionButton({ campaignId, sessionId }: DeleteSessionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    const supabase = createClient();
    // .select() returns the deleted rows: RLS refusing a delete is not an error,
    // it just deletes nothing, so an empty result has to be checked.
    const { data, error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('campaign_id', campaignId)
      .select('id');

    if (deleteError || !data || data.length === 0) {
      setBusy(false);
      setOpen(false);
      setError(
        deleteError?.message ??
          'This session could not be deleted. It may still be open, or it was already deleted.'
      );
      return;
    }

    router.push(`/campaigns/${campaignId}/sessions`);
    router.refresh();
  };

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.btnDelete} onClick={() => setOpen(true)} disabled={busy}>
        Delete Session
      </button>
      {error && <p className={styles.errorMsg}>{error}</p>}
      <ConfirmModal
        open={open}
        title="Delete this session?"
        message={CONFIRM_MESSAGE}
        confirmLabel="Delete Session"
        busy={busy}
        typeToConfirmText="DELETE"
        onConfirm={() => void handleDelete()}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
