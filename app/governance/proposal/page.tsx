"use client";

import { useSearchParams } from "next/navigation";
import Text from "@/components/text";
import styles from './proposalModal.module.scss';
//import useSingleProposalData from "@/hooks/gov/useSingleProposalData";
import { calculateVotePercentages, formatDeposit, formatProposalStatus, formatProposalType, formatTime } from "@/utils/gov/formatData";
import Icon from "@/components/icon/icon";
import Button from "@/components/button/button";
import useProposals from "@/hooks/gov/useProposals";
import { useState } from "react";
import { Proposal } from "@/hooks/gov/interfaces/proposal";
import useCantoSigner from "@/hooks/helpers/useCantoSigner";
import Splash from "@/components/splash/splash";
import { VoteOption } from "@/hooks/gov/interfaces/voteOptions";
import Image from "next/image";
import { NEW_ERROR, NewTransactionFlow } from "@/config/interfaces";
import { TransactionFlowType } from "@/config/transactions/txMap";
import { formatBalance } from "@/utils/formatting/balances.utils";
import Container from "@/components/container/container";
import { RadioButton} from "../components/RadioButton/RadioButton";
import { VotingInfoBox } from "../components/VotingInfoBox/VotingInfoBox";




export default function Page() {

  function castVote(proposalId: number,voteOption: VoteOption | null) {
    if(!voteOption){
      return NEW_ERROR("Please select a vote option");
    }
    console.log("cast vote test");
    const newFlow: NewTransactionFlow = {
      icon: "",
      txType: TransactionFlowType.VOTE_TX,
      title: "Vote Tx",
      params: {
        chainId: chainId,
        ethAccount: signer?.account.address ?? "",
        proposalId: proposalId,
        voteOption: voteOption,
      },
    };
    txStore?.addNewFlow({ txFlow: newFlow, signer });
  }

  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const proposalId = Number(id);

  const { txStore, signer,chainId } = useCantoSigner();
  const { proposals,isLoading } = useProposals({ chainId: chainId });
  const [selectedVote, setSelectedVote] = useState<VoteOption | null>(null);

  const [isChecked, setChecked] = useState(false);

  const handleCheck = (voteOption:VoteOption) => {
      setSelectedVote(voteOption);
      setChecked(!isChecked);
  }

  //console.log(selectedVote);
  if(isLoading){

    return (
      <Splash/>
    );
  }
  
  if(!id){
    return (
        <div><Text font="proto_mono">Proposal ID is missing</Text></div>
    );
  }
  const proposal = proposals.find((p) => p.proposal_id === Number(proposalId));

  if (!proposal) {
    return <div><Text font="proto_mono">No proposal found with the ID {proposalId} </Text></div>;
  }
  //console.log(proposal);
  const isActive = formatProposalStatus(proposal.status)=='ACTIVE';

  const votesData = calculateVotePercentages(proposal.final_vote);
  


  return (
    isLoading ? (<Splash/>):
  (<div className={styles.proposalContainer}>
    <div className={styles.proposalHeaderContainer}>
        <div className={styles.proposalCard1}>
          <div style={{borderRight: "1px solid", padding: "10px"}}><Text>#{proposal.proposal_id}</Text></div>
          <div style={{padding: "10px"}}><Text>{formatProposalStatus(proposal.status)}</Text></div>
        </div>
        <div style={{padding: "10px 0px 10px 0px"}}>
            <Text font='proto_mono' size="x-lg">{proposal.title}</Text>
        </div>
        <div>
          <Text opacity={0.4}>{proposal.description}</Text>
        </div>
    </div>
    
    <div className={styles.proposalCardContainer}>
      <div className={styles.proposalCardContainer1}>
        <div className={styles.proposalInfoBox}>
          <div className={styles.proposalInfo}>
            <div><Text font="proto_mono" opacity={0.3}>Type:</Text></div>
            <div><Text font="proto_mono">{formatProposalType(proposal.type_url)}</Text></div>
          </div>
          <div className={styles.proposalInfo}>
            <div><Text font="proto_mono" opacity={0.3}>Total Deposit:</Text></div>
            <div>
              <Text font="proto_mono">{formatDeposit(proposal.total_deposit[0].amount)} <Image
            src="/tokens/canto.svg"
            width={16}
            height={16}
            alt="canto"
            style={{
              filter: "invert(var(--dark-mode))",
            }}
          /></Text>
              {/* <Icon icon={{
            url: "networks/canto.svg",
            size: {
              width: 50,
              height: 50,
            },
          }}
          themed></Icon> */}
          
            </div>
          </div>
          <div className={styles.proposalInfo}>
              <div><Text font="proto_mono" opacity={0.3}>Turnout/ Quorum: </Text></div>
              <div><Text font="proto_mono">38.1% 33.4%</Text></div>
            </div>
        </div>
        <div className={styles.proposalInfoBox2}>
            <div className={styles.proposalInfo2}>
              <div><Text font="proto_mono" opacity={0.3}>Submit Time:</Text></div>
              <div><Text font="proto_mono">{formatTime(proposal.submit_time)}</Text></div>
            </div>
            <div className={styles.proposalInfo2}>
              <div><Text font="proto_mono" opacity={0.3}>Voting End Time:</Text></div>
              <div><Text font="proto_mono">{formatTime(proposal.voting_end_time)}</Text></div>
            </div>
        </div>
        
      </div>
      <div className={styles.proposalCardContainer2}>
       <div className={styles.proposalInfoBoxVoting}>
          <div className={styles.proposalInfoRow1}>
            <VotingInfoBox isActive={isActive} value={VoteOption.YES} selectedVote={selectedVote} votesData={votesData} 
            isSelected={selectedVote==VoteOption.YES} color1="#06FC99" color2="#AFE0CC" onClick={()=>setSelectedVote(VoteOption.YES)}
            ></VotingInfoBox>
          
            
            <VotingInfoBox isActive={isActive} value={VoteOption.NO} selectedVote={selectedVote} votesData={votesData}
            isSelected={selectedVote==VoteOption.NO} color1="#FC5151" color2="#F2877A" onClick={()=>setSelectedVote(VoteOption.NO)}
            ></VotingInfoBox>
          </div>
            
            

            <div className={styles.proposalInfoRow1}>
              <VotingInfoBox isActive={isActive} value={VoteOption.VETO} selectedVote={selectedVote} votesData={votesData}
              isSelected={selectedVote==VoteOption.VETO} color1="#4455EF" color2="#7E86D9" onClick={()=>setSelectedVote(VoteOption.VETO)}
              ></VotingInfoBox>
              <VotingInfoBox isActive={isActive} value={VoteOption.ABSTAIN} selectedVote={selectedVote} votesData={votesData}
              isSelected={selectedVote==VoteOption.ABSTAIN} color1="#6F6969" color2="lightgray" onClick={()=>setSelectedVote(VoteOption.ABSTAIN)}
              ></VotingInfoBox>

            </div>
        </div>
        <div className={styles.VotingButton}>
          <Button width={400} disabled={!isActive} onClick={()=>castVote(proposal.proposal_id, selectedVote)}>Vote</Button>
          {/* {!isActive && <span className={styles.tooltip}>The Proposal is not Active</span>} */}
        </div>
      </div>
    </div>
  </div>)
  );


  {/* <div className={styles.proposalInfoVoting}>

            { isActive && <div className={styles.radioBtnContainer}><RadioButton value={VoteOption.YES} isActive={isActive} 
          onClick={() => setSelectedVote(VoteOption.YES)} selectedValue={selectedVote} checkedColor="lightgreen"></RadioButton> </div>   
              }
            
            
              <div className={styles.votingInfoRow1}>
              
              
             
                <div style={{display: "flex", flexDirection: "row", justifyContent:"space-around"}}> <div className={styles.circle} style={{ backgroundColor: "#06FC99", margin:"10px 5px 0px 10px" }}></div> <div><Text font="proto_mono">Yes</Text></div></div>
                
              </div>
              <div className={styles.votingInfoRow2}>
                  <div className={styles.infoRow1First}><Text font="proto_mono">{votesData.Yes}%</Text></div>
                  <div className={styles.infoRow1First}>
                        <Container
                            direction="row"
                            gap={6}
                            center={{
                              vertical: true,
                            }}
                          >
                            <Text font="proto_mono" opacity={0.4} size="x-sm">{formatBalance(votesData.YesAmount, 2, {
                              commify: true,
                            })}</Text>
                            <Icon
                              icon={{
                                url: "/tokens/canto.svg",
                                size: 16,
                              }}
                            />

                          </Container>
                    </div>
              </div>
              
              

            </div> */}
  

  
  
}
