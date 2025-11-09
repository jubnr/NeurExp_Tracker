// lib/screens/add_study_screen.dart
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart'; // Ajout de la dépendance uuid pour générer des IDs uniques
import 'package:neurexp_tracker/models/study.dart';

class AddStudyScreen extends StatefulWidget {
  const AddStudyScreen({super.key});

  @override
  State<AddStudyScreen> createState() => _AddStudyScreenState();
}

class _AddStudyScreenState extends State<AddStudyScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  String? _selectedMachineType;
  final TextEditingController _expectedParticipantsController = TextEditingController();
  final TextEditingController _sessionsPerParticipantController = TextEditingController();
  final TextEditingController _runsPerSessionController = TextEditingController();
  String? _selectedRunType;
  final TextEditingController _approximateRunDurationController = TextEditingController();

  // Liste des types de machines disponibles pour la première version (MEG uniquement)
  final List<String> _machineTypes = ['MEG']; // 'IRM 3T', 'IRM 7T' pourront être ajoutés plus tard

  // Liste des types de runs
  final List<String> _runTypes = ['Resting State', 'Task', 'Other'];

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _expectedParticipantsController.dispose();
    _sessionsPerParticipantController.dispose();
    _runsPerSessionController.dispose();
    _approximateRunDurationController.dispose();
    super.dispose();
  }

  void _addStudy() {
    if (_formKey.currentState!.validate()) {
      final newStudy = Study(
        id: const Uuid().v4(), // Génère un ID unique
        name: _nameController.text,
        description: _descriptionController.text,
        machineType: _selectedMachineType ?? '',
        expectedParticipants: int.tryParse(_expectedParticipantsController.text) ?? 0,
        sessionsPerParticipant: int.tryParse(_sessionsPerParticipantController.text) ?? 0,
        runsPerSession: int.tryParse(_runsPerSessionController.text) ?? 0,
        runType: _selectedRunType ?? '',
        approximateRunDurationMs: int.tryParse(_approximateRunDurationController.text) ?? 0,
      );
      Navigator.of(context).pop(newStudy); // Retourne la nouvelle étude à l'écran précédent
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ajouter une nouvelle étude'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nom de l\'étude'),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez entrer un nom pour l\'étude';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(labelText: 'Description'),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedMachineType,
                decoration: const InputDecoration(labelText: 'Type de machine'),
                items: _machineTypes.map((String type) {
                  return DropdownMenuItem<String>(
                    value: type,
                    child: Text(type),
                  );
                }).toList(),
                onChanged: (newValue) {
                  setState(() {
                    _selectedMachineType = newValue;
                  });
                },
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez sélectionner un type de machine';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _expectedParticipantsController,
                decoration: const InputDecoration(labelText: 'Nombre de participants attendus'),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez entrer le nombre de participants';
                  }
                  if (int.tryParse(value) == null) {
                    return 'Veuillez entrer un nombre valide';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _sessionsPerParticipantController,
                decoration: const InputDecoration(labelText: 'Nombre de sessions par participant'),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez entrer le nombre de sessions';
                  }
                  if (int.tryParse(value) == null) {
                    return 'Veuillez entrer un nombre valide';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _runsPerSessionController,
                decoration: const InputDecoration(labelText: 'Nombre de runs par session'),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez entrer le nombre de runs';
                  }
                  if (int.tryParse(value) == null) {
                    return 'Veuillez entrer un nombre valide';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedRunType,
                decoration: const InputDecoration(labelText: 'Type de run'),
                items: _runTypes.map((String type) {
                  return DropdownMenuItem<String>(
                    value: type,
                    child: Text(type),
                  );
                }).toList(),
                onChanged: (newValue) {
                  setState(() {
                    _selectedRunType = newValue;
                  });
                },
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez sélectionner un type de run';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _approximateRunDurationController,
                decoration: const InputDecoration(labelText: 'Durée approximative d\'un run (en minutes)'),
                keyboardType: TextInputType.number,
                // Ce champ est optionnel, donc pas de validator strict ici
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _addStudy,
                child: const Text('Ajouter l\'étude'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}