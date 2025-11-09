// lib/widgets/study_card.dart
import 'package:flutter/material.dart';
import 'package:neurexp_tracker/models/study.dart';
import 'package:neurexp_tracker/screens/study_detail_screen.dart';
import 'package:neurexp_tracker/utils/constants.dart'; // Importez vos constantes

class StudyCard extends StatelessWidget {
  final Study study;

  const StudyCard({super.key, required this.study});

  @override
  Widget build(BuildContext context) {
    return Card(
      // Margin est maintenant géré par cardTheme dans main.dart
      child: InkWell( // Permet de rendre la carte cliquable
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => StudyDetailScreen(study: study),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Ligne pour l'icône de machine et le titre
              Row(
                children: [
                  Icon(_getMachineIcon(study.machineType), color: kMediumBlue, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      study.name,
                      style: kCardTitleTextStyle,
                      overflow: TextOverflow.ellipsis, // Gérer les titres trop longs
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Description abrégée
              Text(
                study.description,
                style: kCardSubtitleTextStyle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 16),
              // Barre de progression et compteurs
              Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Progression',
                        style: kProgressTextStyle.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${study.completedParticipants}/${study.expectedParticipants}',
                        style: kProgressTextStyle,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect( // Pour arrondir les coins de la barre de progression
                    borderRadius: BorderRadius.circular(5.0),
                    child: LinearProgressIndicator(
                      value: _getProgressValue(study),
                      minHeight: 10.0,
                      backgroundColor: kPaleBlue, // Couleur de fond de la barre
                      valueColor: const AlwaysStoppedAnimation<Color>(kDarkBlue), // Couleur de la barre remplie
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Méthode utilitaire pour choisir une icône basée sur le type de machine
  IconData _getMachineIcon(String machineType) {
    switch (machineType) {
      case 'MEG':
        return Icons.sensors;
      case 'IRM 3T':
        return Icons.image_search; // Changé pour une icône plus évocatrice d'IRM
      case 'IRM 7T':
        return Icons.center_focus_strong; // Une autre icône pour IRM 7T
      default:
        return Icons.device_hub;
    }
  }

  // Méthode utilitaire pour calculer la valeur de la barre de progression
  double _getProgressValue(Study study) {
    if (study.expectedParticipants == 0) {
      return 0.0;
    }
    // Assurez-vous que study.completedParticipants est bien mis à jour
    return study.completedParticipants.toDouble() / study.expectedParticipants.toDouble();
  }
}