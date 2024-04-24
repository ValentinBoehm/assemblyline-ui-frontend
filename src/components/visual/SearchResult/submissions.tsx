import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import { AlertTitle, Skeleton, Tooltip } from '@mui/material';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import useALContext from 'components/hooks/useALContext';
import Classification from 'components/visual/Classification';
import Moment from 'components/visual/Moment';
import SubmissionState from 'components/visual/SubmissionState';
import Verdict from 'components/visual/Verdict';
import { maxLenStr } from 'helpers/utils';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DivTable,
  DivTableBody,
  DivTableCell,
  DivTableHead,
  DivTableRow,
  LinkRow,
  SortableHeaderCell
} from '../DivTable';
import InformativeAlert from '../InformativeAlert';

export type SubmissionResult = {
  classification: string;
  error_count: number;
  file_count: number;
  from_archive: boolean;
  id: string;
  max_score: number;
  params: {
    description: string;
    submitter: string;
  };
  sid: string;
  state: string;
  times: {
    submitted: string;
  };
};

type SearchResults = {
  items: SubmissionResult[];
  total: number;
};

type SubmissionsTableProps = {
  submissionResults: SearchResults;
  allowSort?: boolean;
};

const WrappedSubmissionsTable: React.FC<SubmissionsTableProps> = ({ submissionResults, allowSort = true }) => {
  const { t, i18n } = useTranslation(['search']);
  const { c12nDef } = useALContext();

  return submissionResults ? (
    submissionResults.total !== 0 ? (
      <TableContainer component={Paper}>
        <DivTable>
          <DivTableHead>
            <DivTableRow>
              <SortableHeaderCell sortField="times.submitted" allowSort={allowSort}>
                {t('header.starttime')}
              </SortableHeaderCell>
              <SortableHeaderCell sortField="max_score" allowSort={allowSort}>
                {t('header.verdict')}
              </SortableHeaderCell>
              <DivTableCell>{t('header.description')}</DivTableCell>
              <SortableHeaderCell sortField="params.submitter" allowSort={allowSort}>
                {t('header.user')}
              </SortableHeaderCell>
              <SortableHeaderCell sortField="file_count" allowSort={allowSort}>
                {t('header.numfiles')}
              </SortableHeaderCell>
              {c12nDef && c12nDef.enforce && (
                <SortableHeaderCell sortField="classification" allowSort={allowSort}>
                  {t('header.classification')}
                </SortableHeaderCell>
              )}
              <SortableHeaderCell sortField="error_count" allowSort={allowSort}>
                {t('header.status')}
              </SortableHeaderCell>
              <DivTableCell />
            </DivTableRow>
          </DivTableHead>
          <DivTableBody>
            {submissionResults.items.map((submission, id) => (
              <LinkRow
                key={id}
                component={Link}
                to={
                  submission.state === 'completed'
                    ? `/submission/${submission.id}`
                    : `/submission/detail/${submission.id}`
                }
                hover
                style={{ textDecoration: 'none' }}
              >
                <DivTableCell>
                  <Tooltip title={submission.times.submitted}>
                    <div>
                      <Moment variant="fromNow">{submission.times.submitted}</Moment>
                    </div>
                  </Tooltip>
                </DivTableCell>
                <DivTableCell>
                  <Verdict score={submission.max_score} fullWidth />
                </DivTableCell>
                <DivTableCell breakable>{maxLenStr(submission.params.description, 150)}</DivTableCell>
                <DivTableCell style={{ whiteSpace: 'nowrap' }}>{submission.params.submitter}</DivTableCell>
                <DivTableCell>{submission.file_count}</DivTableCell>
                {c12nDef && c12nDef.enforce && (
                  <DivTableCell>
                    <Classification type="text" size="tiny" c12n={submission.classification} format="short" />
                  </DivTableCell>
                )}
                <DivTableCell style={{ textAlign: 'center' }}>
                  <SubmissionState state={submission.state} error_count={submission.error_count} />
                </DivTableCell>
                <DivTableCell style={{ textAlign: 'center' }}>
                  {submission.from_archive && (
                    <Tooltip title={t('archive')}>
                      <ArchiveOutlinedIcon />
                    </Tooltip>
                  )}
                </DivTableCell>
              </LinkRow>
            ))}
          </DivTableBody>
        </DivTable>
      </TableContainer>
    ) : (
      <div style={{ width: '100%' }}>
        <InformativeAlert>
          <AlertTitle>{t('no_submissions_title')}</AlertTitle>
          {t('no_results_desc')}
        </InformativeAlert>
      </div>
    )
  ) : (
    <Skeleton variant="rectangular" style={{ height: '6rem', borderRadius: '4px' }} />
  );
};

const SubmissionsTable = React.memo(WrappedSubmissionsTable);
export default SubmissionsTable;
