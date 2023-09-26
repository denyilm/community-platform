import { format } from 'date-fns'
import {
  Button,
  FollowButton,
  LinkifyText,
  ModerationStatus,
  UsefulStatsButton,
  Username,
  ViewsCounter,
  ConfirmModal,
  Icon
} from 'oa-components'
import { useEffect, useState, Fragment } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { AuthWrapper } from 'src/common/AuthWrapper'
import { isUserVerified } from 'src/common/isUserVerified'
import type { IResearch } from 'src/models/research.models'
import type { IUser } from 'src/models/user.models'
import { useResearchStore } from 'src/stores/Research/research.store'
import {
  addIDToSessionStorageArray,
  retrieveSessionStorageArray,
} from 'src/utils/sessionStorage'
import { Box, Flex, Heading, Text } from 'theme-ui'
import { trackEvent } from 'src/common/Analytics'
import { logger } from 'src/logger'

interface IProps {
  research: IResearch.ItemDB
  isEditable: boolean
  isDeletable: boolean
  loggedInUser: IUser | undefined
  needsModeration: boolean
  votedUsefulCount?: number
  hasUserVotedUseful: boolean
  hasUserSubscribed: boolean
  moderateResearch: (accepted: boolean) => void
  onUsefulClick: () => void
  onFollowClick: () => void
  contributors?: { userName: string; isVerified: boolean }[]
}

const ResearchDescription = ({
  research,
  isEditable,
  isDeletable,
  ...props
}: IProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [researchStats, setResearchStats] = useState([])
  const [showStats, setShowStats] = useState(false)
  const history = useHistory()

  const dateLastUpdateText = (research: IResearch.ItemDB): string => {
    const contentModifiedDate = format(
      new Date(research._contentModifiedTimestamp || research._modified),
      'DD-MM-YYYY',
    )
    const creationDate = format(new Date(research._created), 'DD-MM-YYYY')
    if (contentModifiedDate !== creationDate) {
      return `Last update on ${contentModifiedDate}`
    } else {
      return ''
    }
  }
  let didInit = false
  const store = useResearchStore()
  const [viewCount, setViewCount] = useState<number | undefined>()

  const incrementViewCount = async () => {
    const sessionStorageArray = retrieveSessionStorageArray('research')

    if (!sessionStorageArray.includes(research._id)) {
      const updatedViewCount = await store.incrementViewCount(research._id)
      setViewCount(updatedViewCount)
      addIDToSessionStorageArray('research', research._id)
    } else {
      setViewCount(research.total_views)
    }
  }

  const handleDelete = async (_id: string) => {
    try {
      await store.deleteResearch(_id)
      trackEvent({
        category: 'Research',
        action: 'Deleted',
        label: store.activeResearchItem?.title,
      })
      logger.debug(
        {
          category: 'Research',
          action: 'Deleted',
          label: store.activeResearchItem?.title,
        },
        'Research marked for deletion',
      )

      history.push('/research')
    } catch (err) {
      logger.error(err)
      // at least log the error
    }
  }

  const handleShowStats = () => {
    setShowStats(!showStats)
  }

  useEffect(() => {
    if (!didInit) {
      didInit = true
      incrementViewCount()
    }
    const researchStats = [
      {
        icon: 'view',
        key: 'total_views',
        text: 'views'
      },
      {
        icon: 'thunderbolt',
        key: 'subscribers',
        text: 'following',
      },
      {
        icon: 'star',
        key: 'votedUsefulBy',
        text: 'useful',
      },
      {
        icon: 'update',
        key: 'updates',
        text: 'updates',
      },
    ]
    setResearchStats(researchStats)
  }, [research._id])

  return (
      <Flex
        data-cy="research-basis"
        data-id={research._id}
        sx={{
          position: 'relative',
          borderRadius: 2,
          bg: 'white',
          borderColor: 'black',
          borderStyle: 'solid',
          borderWidth: '2px',
          overflow: 'hidden',
          flexDirection: ['column-reverse', 'column-reverse', 'row'],
          mt: 4,
        }}
      >
        <Flex
          sx={{
            pt: '2%',
            pl: '5%',
            pr: '5%',
            pb: showStats?'10%':'2%',
            borderRadius: 0,
            bg: 'white',
            borderColor: 'black',
            borderStyle: 'solid',
            borderWidth: '1px 0px 0px 0px',
            overflow: 'hidden',
            flexDirection: ['column', 'column', 'column'],
            display: ['flex', 'none', 'none'],
            mb: 0,
          }}
        >
          <Flex 
            sx={{
              flexDirection: ['row', 'row', 'row'],
              alignItems: 'center',
              justifyContent: 'space-between',
              display: ['flex', 'none', 'none'],
            }}
          > 
            <Text
              variant="auxiliary"
              pl={2}
              sx={{
                color: 'black',
                display: 'inline-block',
                fontFamily: 'Varela Round',
                fontSize: '13px'
              }}
            >
              {showStats?'':'More Information'}
            </Text>
            <Button
              variant={'subtle'}
              showIconOnly={true}
              icon={showStats?'chevron-up':'chevron-down'}
              onClick={handleShowStats}
              small={true}
              sx={{
                bg:'white',
                borderWidth: '0px',
                '&:hover': {
                  bg: 'white'
                },
                '&:active': {
                  bg: 'white'
                }
              }}
            />
          </Flex>
          {
            researchStats.map((stat,i) => 
            <Flex 
              key={i}
              sx={{
                pb: 1,
                pl: 1,
                flexDirection: 'row',
                alignItems: 'center',
                display: showStats?'flex':'none'
              }}
            >
              <Icon size={18} glyph={stat.icon}/>
              <Text
                variant="auxiliary"
                sx={{
                  color: 'lightgrey',
                  '&!important': {
                    color: 'lightgrey',
                  },
                  fontFamily: 'Varela Round',
                  ml: 1
                }}
              >
                {`${typeof research[stat.key]=='number'?research[stat.key]:research[stat.key].length} ${stat.text}`}
              </Text>
            </Flex>
            )
          }
          {props.contributors && props?.contributors.length ? (
            <Flex
              mt={1}
              sx={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                display: [showStats?'flex':'none','none','none']
              }}
            >
              <Flex sx={{ alignItems: 'center' }}>
                <Text
                  variant="auxiliary"
                  mt={1}
                  mr={1}
                  sx={{
                    color: 'lightgrey',
                  }}
                >
                  With contributions from
                </Text>
              </Flex>
              {props.contributors.map((contributor, key) => (
                <Username
                  key={key}
                  user={contributor}
                  isVerified={contributor.isVerified}
                />
              ))}
            </Flex>
          ) : null}
        </Flex>
      <Flex px={4} py={4} sx={{ flexDirection: 'column', width: '100%' }}>
        {research._deleted && (
          <Fragment>
            <Text color="red" pl={2} mb={2} data-cy="research-deleted">
              * Marked for deletion
            </Text>
          </Fragment>
        )}

        <Flex sx={{ flexWrap: 'wrap', gap: '10px' }}>
          {research.moderation === 'accepted' && (
            <UsefulStatsButton
              votedUsefulCount={props.votedUsefulCount}
              hasUserVotedUseful={props.hasUserVotedUseful}
              isLoggedIn={props.loggedInUser ? true : false}
              onUsefulClick={props.onUsefulClick}
            />
          )}
          <FollowButton
            hasUserSubscribed={props.hasUserSubscribed}
            isLoggedIn={props.loggedInUser ? true : false}
            onFollowClick={props.onFollowClick}
          ></FollowButton>
          {/* Check if research should be moderated */}
          {props.needsModeration &&
            research.moderation === 'awaiting-moderation' && (
              <Flex sx={{ justifyContent: 'space-between' }}>
                <Button
                  data-cy={'accept'}
                  variant={'primary'}
                  icon="check"
                  mr={1}
                  onClick={() => props.moderateResearch(true)}
                />
                <Button
                  data-cy="reject-research"
                  variant={'outline'}
                  icon="delete"
                  onClick={() => props.moderateResearch(false)}
                />
              </Flex>
            )}
          {/* Show edit button for the creator of the research OR a super-admin */}
          {isEditable && (
            <Link to={'/research/' + research.slug + '/edit'}>
              <Button variant={'primary'} data-cy={'edit'}>
                Edit
              </Button>
            </Link>
          )}

          {isDeletable && (
            <Fragment>
              <Button
                data-cy="Research: delete button"
                variant={'secondary'}
                icon="delete"
                disabled={research._deleted}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete
              </Button>

              <ConfirmModal
                key={research._id}
                isOpen={showDeleteModal}
                message="Are you sure you want to delete this Research?"
                confirmButtonText="Delete"
                handleCancel={() => setShowDeleteModal(false)}
                handleConfirm={() => handleDelete && handleDelete(research._id)}
              />
            </Fragment>
          )}
        </Flex>
        <Box mt={3} mb={2}>
          <Flex sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Flex sx={{ flexDirection: 'column' }}>
              <Flex sx={{ alignItems: 'center' }}>
                <Flex sx={{ alignItems: 'center' }}>
                  <Username
                    user={{
                      userName: research._createdBy,
                      countryCode: research.creatorCountry,
                    }}
                    isVerified={isUserVerified(research._createdBy)}
                  />
                  <Text
                    variant="auxiliary"
                    sx={{
                      marginTop: 2,
                      marginBottom: 2,
                    }}
                  >
                    {`| Started on ${format(
                      new Date(research._created),
                      'DD-MM-YYYY',
                    )}`}
                  </Text>
                </Flex>
              </Flex>

              <Text
                variant="auxiliary"
                sx={{
                  color: 'lightgrey',
                  '&!important': {
                    color: 'lightgrey',
                  },
                }}
                mt={1}
                mb={2}
              >
                {dateLastUpdateText(research)}
              </Text>
            </Flex>
            {props.contributors && props?.contributors.length ? (
              <Flex
                mt={1}
                sx={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  display: ['none','flex','flex']
                }}
              >
                <Flex sx={{ alignItems: 'center' }}>
                  <Text
                    variant="auxiliary"
                    mt={1}
                    mr={1}
                    sx={{
                      color: 'lightgrey',
                    }}
                  >
                    With contributions from
                  </Text>
                </Flex>
                {props.contributors.map((contributor, key) => (
                  <Username
                    key={key}
                    user={contributor}
                    isVerified={contributor.isVerified}
                  />
                ))}
              </Flex>
            ) : null}
          </Flex>

          <Heading mt={2} mb={1}>
            {research.title}
          </Heading>
          <Text variant="paragraph" sx={{ whiteSpace: 'pre-line' }}>
            <LinkifyText>{research.description}</LinkifyText>
          </Text>
          
        </Box>
      </Flex>
      {research.moderation !== 'accepted' && (
        <ModerationStatus
          status={research.moderation}
          contentType="research"
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        />
      )}
    </Flex>
  )
}

export default ResearchDescription
