import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import PersonIcon from '@mui/icons-material/Person';
import { useMediaQuery, useTheme } from '@mui/material';
import Typography from '@mui/material/Typography';
import makeStyles from '@mui/styles/makeStyles';
import PageFullWidth from 'commons/components/pages/PageFullWidth';
import PageHeader from 'commons/components/pages/PageHeader';
import useALContext from 'components/hooks/useALContext';
import useMyAPI from 'components/hooks/useMyAPI';
import { SubmissionIndexed } from 'components/models/base/submission';
import { SearchResult } from 'components/models/ui/search';
import SearchBar from 'components/visual/SearchBar/search-bar';
import { DEFAULT_SUGGESTION } from 'components/visual/SearchBar/search-textfield';
import SimpleSearchQuery from 'components/visual/SearchBar/simple-search-query';
import SearchPager from 'components/visual/SearchPager';
import SubmissionsTable from 'components/visual/SearchResult/submissions';
import SearchResultCount from 'components/visual/SearchResultCount';
import { safeFieldValue } from 'helpers/utils';
import 'moment/locale/fr';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useLocation } from 'react-router-dom';
import ForbiddenPage from './403';

const PAGE_SIZE = 25;

const useStyles = makeStyles(theme => ({
  searchresult: {
    fontStyle: 'italic',
    paddingTop: theme.spacing(0.5),
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  }
}));

export default function Submissions() {
  const { t } = useTranslation(['submissions']);
  const theme = useTheme();
  const classes = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const { apiCall } = useMyAPI();
  const { user: currentUser, indexes } = useALContext();

  const [pageSize] = useState(PAGE_SIZE);
  const [submissionResults, setSubmissionResults] = useState<SearchResult<SubmissionIndexed>>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState<SimpleSearchQuery>(null);
  const [suggestions] = useState([
    ...Object.keys(indexes.submission).filter(name => indexes.submission[name].indexed),
    ...DEFAULT_SUGGESTION
  ]);

  const filterValue = useRef<string>('');

  const upMD = useMediaQuery(theme.breakpoints.up('md'));

  const onClear = () => {
    navigate(location.pathname);
  };

  const onSearch = () => {
    if (filterValue.current !== '') {
      query.set('query', filterValue.current);
      navigate(`${location.pathname}?${query.toString()}`);
    } else {
      onClear();
    }
  };

  const onFilterValueChange = (inputValue: string) => {
    filterValue.current = inputValue;
  };

  useEffect(() => {
    setSearching(true);
    setQuery(
      new SimpleSearchQuery(location.search, `query=*&rows=${pageSize}&offset=0&filters=NOT%20to_be_deleted:true`)
    );
  }, [location.search, pageSize]);

  useEffect(() => {
    if (query && currentUser.roles.includes('submission_view')) {
      query.set('rows', pageSize);
      query.set('offset', 0);
      apiCall<SearchResult<SubmissionIndexed>>({
        method: 'POST',
        url: '/api/v4/search/submission/',
        body: query.getParams(),
        onSuccess: api_data => setSubmissionResults(api_data.api_response),
        onFinalize: () => setSearching(false)
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return currentUser.roles.includes('submission_view') ? (
    <PageFullWidth margin={4}>
      <div style={{ paddingBottom: theme.spacing(2) }}>
        <Typography variant="h4">{t('title')}</Typography>
      </div>
      <PageHeader isSticky>
        <div style={{ paddingTop: theme.spacing(1) }}>
          <SearchBar
            initValue={query ? query.get('query', '') : ''}
            placeholder={t('filter')}
            searching={searching}
            suggestions={suggestions}
            onValueChange={onFilterValueChange}
            onClear={onClear}
            onSearch={onSearch}
            buttons={[
              {
                icon: <PersonIcon fontSize={upMD ? 'medium' : 'small'} />,
                tooltip: t('my_submission'),
                props: {
                  onClick: () => {
                    query.set('query', `params.submitter:${safeFieldValue(currentUser.username)}`);
                    navigate(`${location.pathname}?${query.getDeltaString()}`);
                  }
                }
              },
              {
                icon: <AssignmentTurnedInIcon fontSize={upMD ? 'medium' : 'small'} />,
                tooltip: t('completed_submissions'),
                props: {
                  onClick: () => {
                    query.set('query', 'state:completed');
                    navigate(`${location.pathname}?${query.getDeltaString()}`);
                  }
                }
              },
              {
                icon: <BugReportOutlinedIcon fontSize={upMD ? 'medium' : 'small'} />,
                tooltip: t('malicious_submissions'),
                props: {
                  onClick: () => {
                    query.set('query', 'max_score:>=1000');
                    navigate(`${location.pathname}?${query.getDeltaString()}`);
                  }
                }
              }
            ]}
          >
            {submissionResults !== null && (
              <div className={classes.searchresult}>
                {submissionResults.total !== 0 && (
                  <Typography variant="subtitle1" color="secondary" style={{ flexGrow: 1 }}>
                    {searching ? (
                      <span>{t('searching')}</span>
                    ) : (
                      <span>
                        <SearchResultCount count={submissionResults.total} />
                        {query.get('query')
                          ? t(`filtered${submissionResults.total === 1 ? '' : 's'}`)
                          : t(`total${submissionResults.total === 1 ? '' : 's'}`)}
                      </span>
                    )}
                  </Typography>
                )}

                <SearchPager
                  total={submissionResults.total}
                  setResults={setSubmissionResults}
                  pageSize={pageSize}
                  index="submission"
                  query={query}
                  setSearching={setSearching}
                />
              </div>
            )}
          </SearchBar>
        </div>
      </PageHeader>
      <div style={{ paddingTop: theme.spacing(2), paddingLeft: theme.spacing(0.5), paddingRight: theme.spacing(0.5) }}>
        <SubmissionsTable submissionResults={submissionResults} />
      </div>
    </PageFullWidth>
  ) : (
    <ForbiddenPage />
  );
}
