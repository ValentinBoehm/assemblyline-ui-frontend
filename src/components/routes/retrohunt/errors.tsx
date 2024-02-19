import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
  AlertTitle,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Pagination,
  Paper,
  Skeleton,
  Tooltip,
  Typography
} from '@mui/material';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import makeStyles from '@mui/styles/makeStyles';
import useAppUser from 'commons/components/app/hooks/useAppUser';
import useALContext from 'components/hooks/useALContext';
import useMyAPI from 'components/hooks/useMyAPI';
import { Retrohunt } from 'components/models/base/retrohunt';
import { CustomUser } from 'components/models/ui/user';
import {
  DivTable,
  DivTableBody,
  DivTableCell,
  DivTableHead,
  DivTableRow,
  SortableHeaderCell
} from 'components/visual/DivTable';
import InformativeAlert from 'components/visual/InformativeAlert';
import SimpleSearchQuery from 'components/visual/SearchBar/simple-search-query';
import SearchResultCount from 'components/visual/SearchResultCount';
import 'moment/locale/fr';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const useStyles = makeStyles(theme => ({
  dialogTitle: {
    display: 'flex',
    flexDirection: 'row'
  },
  titleContainer: {
    flex: 1
  },
  pagination: {
    justifyContent: 'center'
  },
  searchBar: {
    fontStyle: 'italic',
    paddingTop: theme.spacing(0.5),
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  }
}));

type RetrohuntErrorResult = {
  items: string[];
  offset: number;
  rows: number;
  total: number;
};

type Prop = {
  retrohunt?: Retrohunt;
  open?: boolean;
  onClose?: () => void;
};

const PAGE_SIZE = 20;

const MAX_TRACKED_RECORDS = 10000;

const RELOAD_DELAY = 5000;

const DEFAULT_PARAMS: object = {
  offset: 0,
  rows: PAGE_SIZE,
  sort: null
};

const DEFAULT_QUERY: string = Object.keys(DEFAULT_PARAMS)
  .map(k => `${k}=${DEFAULT_PARAMS[k]}`)
  .join('&');

const WrappedRetrohuntErrors = ({ retrohunt = null, open = false, onClose = () => null }: Prop) => {
  const { t } = useTranslation(['retrohunt']);
  const classes = useStyles();
  const { apiCall } = useMyAPI();
  const { configuration } = useALContext();
  const { user: currentUser } = useAppUser<CustomUser>();

  const [errorResults, setErrorResults] = useState<RetrohuntErrorResult>(null);
  const [isReloading, setIsReloading] = useState<boolean>(true);
  const [query, setQuery] = useState<SimpleSearchQuery>(new SimpleSearchQuery(DEFAULT_QUERY));

  const timer = useRef<boolean>(false);

  const errorPageCount = useMemo<number>(
    () =>
      errorResults && 'total' in errorResults
        ? Math.ceil(Math.min(errorResults.total, MAX_TRACKED_RECORDS) / PAGE_SIZE)
        : 0,
    [errorResults]
  );

  const reloadErrors = useCallback(
    (curCode: string, searchParam: string) => {
      if (currentUser.roles.includes('retrohunt_view') && configuration?.retrohunt?.enabled) {
        const curQuery = new SimpleSearchQuery(searchParam, DEFAULT_QUERY);
        apiCall({
          method: 'POST',
          url: `/api/v4/retrohunt/errors/${curCode}/`,
          body: curQuery.getParams(),
          onSuccess: api_data => setErrorResults(api_data.api_response),
          onEnter: () => setIsReloading(true),
          onExit: () => setIsReloading(false)
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser?.roles]
  );

  const handleQueryChange = useCallback((key: string, value: string | number) => {
    setQuery(prev => {
      const q = new SimpleSearchQuery(prev.toString(), DEFAULT_QUERY);
      q.set(key, value);
      return q;
    });
  }, []);

  useEffect(() => {
    if (open && retrohunt && 'code' in retrohunt) reloadErrors(retrohunt.code, query.getDeltaString());
  }, [open, query, reloadErrors, retrohunt]);

  useEffect(() => {
    if (!timer.current && open && retrohunt && 'finished' in retrohunt && !retrohunt.finished) {
      timer.current = true;
      setTimeout(() => {
        reloadErrors(retrohunt.code, query.toString());
        timer.current = false;
      }, RELOAD_DELAY);
    }
  }, [open, query, reloadErrors, retrohunt]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className={classes.dialogTitle}>
        <div className={classes.titleContainer}>
          <div>{t('errors.view.title')}</div>
        </div>
        <div>
          <Tooltip title={t('errors.close')}>
            <div>
              <IconButton onClick={onClose}>
                <CloseOutlinedIcon />
              </IconButton>
            </div>
          </Tooltip>
        </div>
      </DialogTitle>
      <DialogContent>
        {!errorResults ? (
          <Skeleton variant="rectangular" style={{ height: '6rem', borderRadius: '4px' }} />
        ) : !('total' in errorResults) || errorResults.total === 0 ? (
          <div style={{ width: '100%' }}>
            <InformativeAlert>
              <AlertTitle>{t('no_results_title')}</AlertTitle>
              {t('no_results_desc')}
            </InformativeAlert>
          </div>
        ) : (
          <>
            <div className={classes.searchBar}>
              {errorResults && 'total' in errorResults && errorResults.total !== 0 && (
                <Typography variant="subtitle1" color="secondary" style={{ flexGrow: 1 }}>
                  {isReloading ? (
                    <span>{t('searching')}</span>
                  ) : (
                    <span>
                      <SearchResultCount count={errorResults.total} />
                      {query.get('query')
                        ? t(`errors.filtered${errorResults.total === 1 ? '' : 's'}`)
                        : t(`errors.total${errorResults.total === 1 ? '' : 's'}`)}
                    </span>
                  )}
                </Typography>
              )}
              {errorPageCount > 1 && (
                <Pagination
                  page={Math.ceil(1 + query.get('offset') / PAGE_SIZE)}
                  onChange={(e, value) => handleQueryChange('offset', (value - 1) * PAGE_SIZE)}
                  count={errorPageCount}
                  shape="rounded"
                  size="small"
                  classes={{
                    ul: classes.pagination
                  }}
                />
              )}
            </div>
            <div style={{ height: '4px' }}>{isReloading && <LinearProgress />}</div>
            <TableContainer component={Paper}>
              <DivTable>
                <DivTableHead>
                  <DivTableRow>
                    <SortableHeaderCell
                      query={query}
                      children={t('details.message')}
                      sortName="sort"
                      sortField="error"
                      onSort={(e, { name, field }) => handleQueryChange(name, field)}
                    />
                  </DivTableRow>
                </DivTableHead>
                <DivTableBody>
                  {errorResults.items.map((error, id) => (
                    <DivTableRow key={id} hover style={{ textDecoration: 'none' }}>
                      <DivTableCell>{error}</DivTableCell>
                    </DivTableRow>
                  ))}
                </DivTableBody>
              </DivTable>
            </TableContainer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const RetrohuntErrors = React.memo(WrappedRetrohuntErrors);
export default RetrohuntErrors;
