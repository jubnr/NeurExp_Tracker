// lib/widgets/participant_card.dart
import 'package:flutter/material.dart';
import 'package:neurexp_tracker/models/participant.dart';
import 'package:neurexp_tracker/models/study.dart';
import 'package:neurexp_tracker/screens/participant_detail_screen.dart';
import 'package:neurexp_tracker/utils/constants.dart';

class ParticipantCard extends StatelessWidget {
  final Participant participant;
  final Study study;

  const ParticipantCard({super.key, required this.participant, required this.study});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ParticipantDetailScreen(
                participant: participant,
                study: study,
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Icon(Icons.person_outline),
              const SizedBox(width: 12),
              Expanded(
                child: Text("NIP ${participant.nip}", style: kCardTitleTextStyle, overflow: TextOverflow.ellipsis),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
